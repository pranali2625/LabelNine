-- Fix product_images URLs to match files in Hostinger product-images/ folder.
-- Run once in phpMyAdmin (select your labelnine DB) or: mysql -u USER -p DB_NAME < fix-product-image-urls.sql
--
-- Files on disk (product-images/):
--   ChatGPT Image Jun 17, 2026, 11_08_57 AM.png
--   ChatGPT Image Jun 18, 2026, 10_13_17 AM.png
--   image_f87328b4.png
--   IMG-20260617-WA0008.jpg
--   IMG-20260618-WA0000.jpg
--   IMG-20260618-WA0001.jpg
--   WhatsApp Image 2026-06-21 at 10.35.57 PM.jpeg

SET @base = 'https://labelnine.in/uploads/products';

-- Product 6: remove broken local path (unsplash images remain for slideshow)
DELETE FROM product_images
WHERE product_id = 6 AND url LIKE '%mens-shirt-ice-blue.png';

-- Product 1: Mens White Cotton Linen Shirt
UPDATE product_images SET url = CONCAT(@base, '/WhatsApp%20Image%202026-06-21%20at%2010.35.57%20PM.jpeg')
WHERE product_id = 1 AND url LIKE '%White B.png';

UPDATE product_images SET url = CONCAT(@base, '/IMG-20260617-WA0008.jpg')
WHERE product_id = 1 AND url LIKE '%WhiteC.png';

UPDATE product_images SET url = CONCAT(@base, '/ChatGPT%20Image%20Jun%2017%2C%202026%2C%2011_08_57%20AM.png')
WHERE product_id = 1 AND url LIKE '%White F.png';

-- Product 2: Mens Brown Check Shirt
UPDATE product_images SET url = CONCAT(@base, '/IMG-20260618-WA0000.jpg')
WHERE product_id = 2 AND url LIKE '%Mens-checks-half-front.png';

UPDATE product_images SET url = CONCAT(@base, '/IMG-20260618-WA0001.jpg')
WHERE product_id = 2 AND url LIKE '%Mens-Checks-full-front.png';

UPDATE product_images SET url = CONCAT(@base, '/ChatGPT%20Image%20Jun%2018%2C%202026%2C%2010_13_17%20AM.png')
WHERE product_id = 2 AND url LIKE '%Mens-checks-full-back.png';

-- Product 3: Mens Black Textured Shirt
UPDATE product_images SET url = CONCAT(@base, '/image_f87328b4.png')
WHERE product_id = 3 AND url LIKE '%mens-black-short-front.png';

-- Product 4: Mens Grey Stripe Shirt (replace invalid ChatGPT share link)
UPDATE product_images SET url = CONCAT(@base, '/IMG-20260617-WA0008.jpg')
WHERE product_id = 4 AND (url LIKE '%chatgpt.com%' OR url LIKE '%m_6a31752a%');

-- Verify
SELECT p.id, p.name, pi.id AS image_id, pi.url
FROM product_images pi
JOIN products p ON p.id = pi.product_id
ORDER BY p.id, pi.id;
