-- 카드 유형(아이디어 검증/수익 사례/새로운 모델/트렌드 신호), 검증·수익 신호, 커뮤니티 호응
ALTER TABLE items ADD COLUMN kind TEXT;
ALTER TABLE items ADD COLUMN signal TEXT;
ALTER TABLE items ADD COLUMN points INTEGER;
ALTER TABLE items ADD COLUMN comments INTEGER;
