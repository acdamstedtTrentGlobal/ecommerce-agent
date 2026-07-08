USE ecommerce;
ALTER TABLE document_chunks MODIFY COLUMN embedding VECTOR(3072) NOT NULL;
ALTER TABLE reviews MODIFY COLUMN embedding VECTOR(3072);
ALTER TABLE document_chunks ADD VECTOR INDEX (embedding);