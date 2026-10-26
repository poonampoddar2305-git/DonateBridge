import logging
from typing import Dict, Any, List, Optional
from .embedding_service import EmbeddingService
from .vector_store import VectorStore
from .ollama_service import OllamaService
from ngo.models import NGO, Need, NeedStatus, EmergencyCampaign

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.08

GROUNDED_RAG_PROMPT = """
You are the DonateBridge Knowledge & Operations Assistant.
Answer the user's question clearly, professionally, and directly using ONLY the most relevant section from the supplied DonateBridge context provided below.

CONTEXT PROVIDED:
{context_text}

RULES:
1. Pay close attention to what the user is specifically asking for:
   - If the user asks about "NGO verification", explain the NGO registration filing, statutory paperwork uploads, and administrator audit queue (approve, reject, request changes).
   - If the user asks about "donor verification" or "donor KYC", explain Aadhaar UID, PAN card, document uploads, and administrator moderation.
   - If the user asks about the "6 logistics tracking steps", explicitly enumerate all 6 sequential milestones (Step 1: Requested, Step 2: Approved, Step 3: Dispatched, Step 4: In Transit, Step 5: Delivered, Step 6: Completed) with their descriptions.
   - If the user asks about "smart matching", explain the 5 multi-factor scoring weights.
2. Use ONLY the provided context to answer the question directly.
3. If the context does not contain the specific answer, reply EXACTLY:
   "The requested information is not available in the DonateBridge knowledge base."
4. Do NOT invent features, APIs, database fields, or speculative capabilities.
5. Format your response in clean Markdown with clear headings and bulleted or numbered items.
6. NEVER output raw markdown table rows (e.g. | Method | Endpoint | Description |) or code blocks.
"""

class RAGService:
    def __init__(self):
        self.embedder = EmbeddingService()
        self.vector_store = VectorStore()
        self.ollama = OllamaService()

    def process_query(self, message: str, user_location: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Routes and answers user queries:
        1. Classifies query into 'smart_match', 'live_data', or 'knowledge'.
        2. Executes retrieval path (Vector RAG for static, Django ORM for live data).
        3. Returns answer, type, and source references.
        """
        msg_lower = message.lower().strip()
        query_type = self._classify_query(msg_lower)

        if query_type == "live_data":
            return self._handle_live_data_query(message, msg_lower)
        elif query_type == "knowledge":
            return self._handle_knowledge_query(message)

        return self._handle_knowledge_query(message)

    def _classify_query(self, msg_lower: str) -> str:
        """Deterministic query classifier."""
        if any(kw in msg_lower for kw in ['i have', 'i want to donate', 'offering', 'giving', 'donating']):
            return "smart_match"

        live_keywords = [
            'which ngos', 'who needs', 'active campaigns', 'current needs',
            'ngos near', 'ngos in', 'current demand', 'available donations'
        ]
        if any(kw in msg_lower for kw in live_keywords):
            return "live_data"

        question_starters = ['what', 'how', 'when', 'where', 'why', 'which', 'who', 'can', 'will', 'is', 'are']
        words = msg_lower.split()
        if msg_lower.endswith('?') or (words and words[0] in question_starters):
            return "knowledge"

        knowledge_keywords = [
            'verification', 'logistics', 'qr', 'smart match', 'documents',
            'contact', 'steps', 'workflow', 'policy', 'rules', 'donatebridge'
        ]
        if any(kw in msg_lower for kw in knowledge_keywords):
            return "knowledge"

        return "smart_match"

    def _clean_section_title(self, section_name: str) -> str:
        if not section_name:
            return "General Overview"
        cleaned = section_name.strip().replace('`', '').strip()
        table_mappings = {
            'ngo_ngo': 'NGO Verification & Profile System',
            'ngo_need': 'Demands & Need Matching',
            'donation_donation': 'Donation Tracking & Delivery',
            'authentication_user': 'User Roles & Authentication',
            'chat_chatmessage': 'Chat Terminal & Communication',
            'logistics_logisticstep': 'Logistics & QR Verification',
        }
        if cleaned in table_mappings:
            return table_mappings[cleaned]
        import re
        cleaned = re.sub(r'^\d+(\.\d+)*\s*', '', cleaned)
        return cleaned if cleaned else "General Overview"

    def _handle_knowledge_query(self, message: str) -> Dict[str, Any]:
        """Performs vector similarity search against static project documentation."""
        query_vector = self.embedder.get_embedding(message)
        search_results = self.vector_store.search(query_vector, top_k=4, query_text=message)

        # Check substantive query terms against knowledge base to reject out-of-scope questions
        import re
        from .embedding_service import STOP_WORDS
        raw_q_words = message.lower().replace('.', ' ').replace(',', ' ').replace('?', ' ').replace(':', ' ').replace('-', ' ').split()
        q_terms = [w for w in raw_q_words if w and w not in STOP_WORDS and len(w) > 1 and w != 'donatebridge']

        all_retrieved_content = " ".join([r.get("content", "").lower() for r in search_results])
        numbers_in_query = re.findall(r'\b\d{3,}\b', message)

        # If user asks about a year or number not present in our knowledge base
        has_unknown_numbers = numbers_in_query and not any(num in all_retrieved_content for num in numbers_in_query)
        unmatched_terms = [t for t in q_terms if t not in all_retrieved_content]

        if not search_results or search_results[0]["score"] < SIMILARITY_THRESHOLD or has_unknown_numbers or len(unmatched_terms) >= 2:
            return {
                "type": "knowledge",
                "answer": "The requested information is not available in the DonateBridge knowledge base.",
                "sources": [],
                "ai_available": True
            }

        # Filter out test suite chunks if query is not asking about unit tests
        is_test_query = any(w in message.lower() for w in ['test', 'coverage', 'pytest', 'unittest', 'assert', 'spec'])
        filtered_results = []
        for res in search_results:
            sec = str(res.get('metadata', {}).get('section', '')).lower()
            if not is_test_query and any(tw in sec for tw in ['test suite', 'unit test', 'test coverage', 'testing']):
                continue
            filtered_results.append(res)

        if not filtered_results:
            filtered_results = search_results

        # Topic-directed focus: prioritize the specific section matching query intent
        msg_l = message.lower()
        topic_filtered = []
        if 'ngo' in msg_l and 'verification' in msg_l:
            topic_filtered = [r for r in filtered_results if 'ngo' in r.get('metadata', {}).get('section', '').lower() and 'logistics' not in r.get('metadata', {}).get('section', '').lower()]
        elif 'logistics' in msg_l or ('step' in msg_l and 'track' in msg_l):
            topic_filtered = [r for r in filtered_results if 'logistics' in r.get('metadata', {}).get('section', '').lower()]
        elif 'donor' in msg_l and any(kw in msg_l for kw in ['identity', 'verification', 'kyc', 'aadhaar', 'pan']):
            topic_filtered = [r for r in filtered_results if 'donor' in r.get('metadata', {}).get('section', '').lower()]
        elif 'smart match' in msg_l or 'algorithm' in msg_l:
            topic_filtered = [r for r in filtered_results if 'smart match' in r.get('metadata', {}).get('section', '').lower()]

        active_results = topic_filtered if topic_filtered else filtered_results[:2]

        context_parts = []
        sources = []
        seen_sources = set()

        for res in active_results:
            clean_sec = self._clean_section_title(res['metadata'].get('section'))
            context_parts.append(f"--- Section: {clean_sec} ---\n{res['content']}")
            src_file = res['metadata'].get('source', 'PROJECT_CONTEXT.md')
            src_key = f"{src_file}#{clean_sec}"
            if src_key not in seen_sources:
                seen_sources.add(src_key)
                sources.append({
                    "source": src_file,
                    "section": clean_sec
                })

        context_text = "\n\n".join(context_parts)
        ai_available = True

        try:
            res_obj = self.ollama.generate(
                prompt=f"USER QUESTION: \"{message}\"",
                system_prompt=GROUNDED_RAG_PROMPT.format(context_text=context_text),
                format_json=False
            )
            answer = res_obj.get("text", "").strip()
            if not answer or len(answer) < 20:
                answer = self._synthesize_grounded_fallback(message, active_results)
        except Exception as e:
            logger.warning(f"Ollama RAG generation fallback: {e}")
            ai_available = False
            answer = self._synthesize_grounded_fallback(message, active_results)

        if "not available in the donatebridge knowledge base" in answer.lower():
            sources = []

        return {
            "type": "knowledge",
            "answer": answer,
            "sources": sources,
            "ai_available": ai_available
        }

    def _synthesize_grounded_fallback(self, message: str, search_results: List[Dict[str, Any]]) -> str:
        """Synthesizes an articulate, well-structured answer directly from top retrieved context chunks without raw table delimiters."""
        if not search_results or search_results[0].get("score", 0) < SIMILARITY_THRESHOLD:
            return "The requested information is not available in the DonateBridge knowledge base."

        import re
        query_words = set(re.findall(r'\b[a-zA-Z0-9]{4,}\b', message.lower())) - {
            'what', 'when', 'where', 'which', 'will', 'would', 'could', 'should', 'about',
            'donatebridge', 'platform', 'system', 'does', 'have', 'from', 'with', 'this', 'that'
        }
        all_retrieved_content = " ".join([r.get("content", "").lower() for r in search_results])
        if query_words and not any(w in all_retrieved_content for w in query_words):
            return "The requested information is not available in the DonateBridge knowledge base."

        top_chunk = search_results[0]
        section_name = top_chunk.get("metadata", {}).get("section", "System Overview")
        clean_section = self._clean_section_title(section_name)
        raw_text = top_chunk.get("content", "")

        clean_lines = []
        for line in raw_text.split('\n'):
            line_str = line.strip()
            # Omit code blocks, section tags, dividers, and raw markdown table lines
            if (not line_str or line_str.startswith('```') or line_str.startswith('#') or 
                line_str.startswith('Section:') or line_str.startswith('|') or line_str == '---'):
                continue
            
            # Preserve numbered step lines
            if re.match(r'^\d+\.\s+\*\*', line_str):
                clean_lines.append(f"\n{line_str}")
                continue
            
            # Format descriptive sub-points
            clean_text = re.sub(r'^[\*\-\•]\s*', '', line_str).strip()
            if clean_text and len(clean_text) > 12:
                clean_lines.append(f"- {clean_text}")

        if clean_lines:
            body = "\n".join(clean_lines[:16]).strip()
        else:
            body = "- Operational details are documented in the verified DonateBridge platform specifications."

        return (
            f"**DonateBridge Knowledge Base - {clean_section}:**\n\n"
            f"{body}\n\n"
            f"*For further assistance, feel free to ask about specific logistics milestones, verification paperwork, or smart match rankings.*"
        )

    def _handle_live_data_query(self, original_msg: str, msg_lower: str) -> Dict[str, Any]:
        """Queries live Django ORM database records for active NGOs, Needs, and Campaigns."""
        sources = [{"source": "Current DonateBridge Database", "section": "Live Records"}]

        if any(w in msg_lower for w in ['need', 'demand', 'blanket', 'food', 'cloth', 'book', 'laptop', 'medicine']):
            active_needs = Need.objects.filter(
                status=NeedStatus.ACTIVE,
                ngo__verification_status='approved'
            ).select_related('ngo')[:5]

            if not active_needs.exists():
                return {
                    "type": "live_data",
                    "answer": "There are currently no active requirements matching your query in the live database.",
                    "sources": sources,
                    "ai_available": True
                }

            need_summaries = []
            for n in active_needs:
                need_summaries.append(f"- {n.ngo.name} ({n.ngo.city}): Needs {n.quantity} units of {n.item} ({n.category}) with {n.urgency} urgency.")

            summary_text = "\n".join(need_summaries)
            answer = f"Here are the active NGO requirements currently recorded in DonateBridge:\n{summary_text}"

            return {
                "type": "live_data",
                "answer": answer,
                "sources": sources,
                "ai_available": True
            }

        if 'campaign' in msg_lower or 'emergency' in msg_lower or 'challenge' in msg_lower:
            campaigns = EmergencyCampaign.objects.filter(is_active=True)[:5]
            if not campaigns.exists():
                return {
                    "type": "live_data",
                    "answer": "There are currently no active emergency campaigns recorded in the live database.",
                    "sources": sources,
                    "ai_available": True
                }

            camp_summaries = []
            for c in campaigns:
                camp_summaries.append(f"- {c.title} (Target: {c.target_items} items, {c.location})")

            summary_text = "\n".join(camp_summaries)
            answer = f"Here are the active emergency campaigns currently listed on DonateBridge:\n{summary_text}"

            return {
                "type": "live_data",
                "answer": answer,
                "sources": sources,
                "ai_available": True
            }

        approved_ngos = NGO.objects.filter(verification_status='approved')[:5]
        if not approved_ngos.exists():
            return {
                "type": "live_data",
                "answer": "No verified NGOs are currently active in the live database.",
                "sources": sources,
                "ai_available": True
            }

        ngo_summaries = []
        for ngo in approved_ngos:
            ngo_summaries.append(f"- {ngo.name} ({ngo.city}, {ngo.state}) - Trust Score: {ngo.trust_score}%")

        summary_text = "\n".join(ngo_summaries)
        answer = f"Here are verified NGOs currently active on DonateBridge:\n{summary_text}"

        return {
            "type": "live_data",
            "answer": answer,
            "sources": sources,
            "ai_available": True
        }
