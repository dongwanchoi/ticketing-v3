CREATE TABLE performance (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(255) NOT NULL,
 venue_name VARCHAR(255) NOT NULL,
 min_price_krw INT NOT NULL,
 max_price_krw INT NOT NULL,
 approval_status VARCHAR(20) NOT NULL,
 CONSTRAINT chk_price CHECK (min_price_krw >= 0 AND max_price_krw >= min_price_krw),
 CONSTRAINT chk_approval CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
 INDEX idx_performance_approval (approval_status, id)
);
