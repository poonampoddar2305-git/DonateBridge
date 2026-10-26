import os
import json
import math
import logging
import threading
from typing import List, Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

VECTOR_STORE_DIR = os.path.join(settings.MEDIA_ROOT, 'vector_store')
INDEX_FILE_PATH = os.path.join(VECTOR_STORE_DIR, 'index.json')

class VectorStore:
    def __init__(self):
        os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
        self._lock = threading.Lock()
        self.chunks: List[Dict[str, Any]] = []
        self._load_index()

    def _load_index(self):
        with self._lock:
            if os.path.exists(INDEX_FILE_PATH):
                try:
                    with open(INDEX_FILE_PATH, 'r', encoding='utf-8') as f:
                        self.chunks = json.load(f)
                except Exception as e:
                    logger.error(f"Error loading vector index file: {e}")
                    self.chunks = []

    def save_index(self):
        with self._lock:
            temp_path = f"{INDEX_FILE_PATH}.tmp"
            try:
                with open(temp_path, 'w', encoding='utf-8') as f:
                    json.dump(self.chunks, f, indent=2)
                os.replace(temp_path, INDEX_FILE_PATH)
            except Exception as e:
                logger.error(f"Error saving vector index file: {e}")
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except OSError:
                        pass

    def add_chunk(self, chunk_id: str, content: str, metadata: Dict[str, Any], vector: List[float]):
        with self._lock:
            for idx, chunk in enumerate(self.chunks):
                if chunk.get("id") == chunk_id:
                    self.chunks[idx] = {
                        "id": chunk_id,
                        "content": content,
                        "metadata": metadata,
                        "vector": vector
                    }
                    return

            self.chunks.append({
                "id": chunk_id,
                "content": content,
                "metadata": metadata,
                "vector": vector
            })

    def search(self, query_vector: List[float], top_k: int = 3, query_text: str = "") -> List[Dict[str, Any]]:
        if not self.chunks or not query_vector:
            return []

        q_norm = math.sqrt(sum(x * x for x in query_vector))
        if q_norm == 0:
            return []

        # Extract non-stop query terms for keyword boosting
        from .embedding_service import STOP_WORDS
        raw_q_words = query_text.lower().replace('.', ' ').replace(',', ' ').replace('?', ' ').replace(':', ' ').replace('-', ' ').split() if query_text else []
        q_terms = [w for w in raw_q_words if w and w not in STOP_WORDS and len(w) > 1]

        is_cmd_query = any(w in query_text.lower() for w in ['clone', 'install', 'setup', 'run', 'command', 'npm', 'git', 'migrate', 'pip'])

        results = []
        for chunk in self.chunks:
            c_vec = chunk.get("vector", [])
            if not c_vec or len(c_vec) != len(query_vector):
                continue

            c_norm = math.sqrt(sum(x * x for x in c_vec))
            if c_norm == 0:
                continue

            dot_prod = sum(a * b for a, b in zip(query_vector, c_vec))
            cos_sim = dot_prod / (q_norm * c_norm)

            # Keyword overlap & term coverage boost
            matched_terms = set()
            section_title = str(chunk.get("metadata", {}).get("section", "")).lower()
            content_lower = chunk.get("content", "").lower()

            if q_terms:
                for term in q_terms:
                    if term in section_title or term in content_lower:
                        matched_terms.add(term)
                kw_ratio = len(matched_terms) / len(q_terms)
            else:
                kw_ratio = 0.0

            # Title match boost if query terms appear in section title
            matched_title_terms = [t for t in q_terms if t in section_title]
            title_boost = (len(matched_title_terms) / len(q_terms)) * 0.4 if q_terms else 0.0

            # Penalty for code setup blocks if query is conceptual Q&A
            code_penalty = 0.0
            if not is_cmd_query and any(cmd_pat in content_lower for cmd_pat in ['git clone', 'npm run', 'cd donatebridge', 'pip install']):
                code_penalty = 0.25

            # Balanced hybrid score combining vector similarity, keyword overlap, and title boost
            final_score = (cos_sim * 0.4) + (kw_ratio * 0.4) + title_boost - code_penalty


            results.append({
                "id": chunk["id"],
                "content": chunk["content"],
                "metadata": chunk["metadata"],
                "score": round(float(max(0.0, final_score)), 4)
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def clear(self):
        self.chunks = []
        self.save_index()
