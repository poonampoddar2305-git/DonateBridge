import logging
import hashlib
import math
from typing import List

logger = logging.getLogger(__name__)

STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
    'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
    'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
    'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
    'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over',
    'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
    'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
    'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
    'whom', 'why', 'will', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves'
}

DOMAIN_KEYWORDS = {
    'donatebridge', 'ngo', 'ngos', 'verification', 'logistics', 'qr', 'smart-match',
    'smartmatch', 'donor', 'donors', 'campaign', 'campaigns', 'disaster', 'trust',
    'score', 'matching', 'audit', 'workflow', 'overview', 'steps', 'policy', 'rules',
    'demand', 'need', 'needs', 'admin', 'api', 'auth', 'security', 'blanket', 'blankets',
    'food', 'books', 'clothing', 'medical', 'urgency', 'tracking', 'milestones', 'pickup'
}

class EmbeddingService:
    def __init__(self):
        self.vector_dim = 384

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates dense 384-dim normalized embedding vector using term feature hashing.
        Filters out stop words and applies domain keyword boosting for precise vector search.
        """
        clean_text = text.strip()
        if not clean_text:
            return [0.0] * self.vector_dim

        vec = [0.0] * self.vector_dim
        words = clean_text.lower().replace('.', ' ').replace(',', ' ').replace('?', ' ').replace(':', ' ').replace('-', ' ').split()
        
        filtered_words = [w for w in words if w and w not in STOP_WORDS and len(w) > 1]
        if not filtered_words:
            filtered_words = [w for w in words if w]

        for w in filtered_words:
            h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
            idx = h % self.vector_dim
            sign = 1.0 if (h % 2 == 0) else -1.0
            weight = 2.5 if w in DOMAIN_KEYWORDS else 1.0
            vec[idx] += sign * weight

        return self._normalize_vector(vec)

    def _normalize_vector(self, vec: List[float]) -> List[float]:
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            return [x / norm for x in vec]
        return vec
