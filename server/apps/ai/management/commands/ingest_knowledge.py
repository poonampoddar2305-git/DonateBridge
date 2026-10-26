import os
import re
import hashlib
from django.core.management.base import BaseCommand
from django.conf import settings
from ai.services.embedding_service import EmbeddingService
from ai.services.vector_store import VectorStore

class Command(BaseCommand):
    help = 'Ingests static documentation files (PROJECT_CONTEXT.md, README.md) into the vector store.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting DonateBridge Knowledge Ingestion..."))
        
        base_dir = settings.BASE_DIR.parent
        files_to_ingest = [
            os.path.join(base_dir, "PROJECT_CONTEXT.md"),
            os.path.join(base_dir, "README.md"),
        ]

        embedder = EmbeddingService()
        vector_store = VectorStore()
        # Wipe old chunks to prevent stale fragments
        vector_store.chunks = []

        total_chunks = 0

        for file_path in files_to_ingest:
            if not os.path.exists(file_path):
                self.stdout.write(self.style.WARNING(f"File not found: {file_path}"))
                continue

            file_basename = os.path.basename(file_path)
            self.stdout.write(f"Processing {file_basename}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            chunks = self._chunk_markdown(file_basename, content)

            for chunk_data in chunks:
                chunk_id = hashlib.md5(f"{file_basename}:{chunk_data['section']}:{chunk_data['content'][:50]}".encode('utf-8')).hexdigest()
                vector = embedder.get_embedding(chunk_data['content'])

                vector_store.add_chunk(
                    chunk_id=chunk_id,
                    content=chunk_data['content'],
                    metadata={
                        "source": file_basename,
                        "section": chunk_data['section']
                    },
                    vector=vector
                )
                total_chunks += 1

        vector_store.save_index()
        self.stdout.write(self.style.SUCCESS(f"Successfully ingested {total_chunks} documentation chunks into vector store!"))

    def _chunk_markdown(self, filename: str, text: str):
        """Splits markdown text by section headers (#, ##, ###) into focused, meaningful chunks."""
        sections = []
        lines = text.split('\n')

        current_header = "General Overview"
        current_buffer = []

        def save_current_chunk(header, buffer):
            if not buffer:
                return
            body_text = "\n".join(buffer).strip()
            # Strip standalone dividers
            body_text = re.sub(r'^\s*---\s*$', '', body_text, flags=re.MULTILINE).strip()
            if len(body_text) < 40:
                return

            clean_header = re.sub(r'^[#\s\d\.]+', '', header).strip() or header
            full_content = f"Section: {clean_header}\n{body_text}"

            # Sub-split only very large blocks (>3000 chars) while keeping sections cohesive
            if len(body_text) > 3000:
                paragraphs = [p.strip() for p in re.split(r'\n\s*\n', body_text) if p.strip() and p.strip() != '---']
                sub_buf = []
                sub_len = 0
                for p in paragraphs:
                    sub_buf.append(p)
                    sub_len += len(p)
                    if sub_len >= 1800:
                        sub_text = "\n\n".join(sub_buf).strip()
                        if len(sub_text) >= 50:
                            sections.append({
                                "section": clean_header,
                                "content": f"Section: {clean_header}\n{sub_text}"
                            })
                        sub_buf = []
                        sub_len = 0
                if sub_buf:
                    sub_text = "\n\n".join(sub_buf).strip()
                    if len(sub_text) >= 50:
                        sections.append({
                            "section": clean_header,
                            "content": f"Section: {clean_header}\n{sub_text}"
                        })
            else:
                sections.append({
                    "section": clean_header,
                    "content": full_content
                })

        for line in lines:
            if line.startswith('#'):
                save_current_chunk(current_header, current_buffer)
                current_buffer = []
                current_header = line.lstrip('#').strip()
            else:
                current_buffer.append(line)

        save_current_chunk(current_header, current_buffer)
        return sections
