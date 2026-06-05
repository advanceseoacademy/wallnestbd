-- 30 customer reviews tied to catalog products (legacy_id)

INSERT INTO reviews (product_id, reviewer_name, rating, comment, is_verified)
SELECT p.id, d.reviewer_name, d.rating, d.comment, d.is_verified
FROM products p
INNER JOIN (
  VALUES
    (1, 'রাহেলা বেগম', 5, 'আয়াতুল কুরসি ক্যানভাস দেয়ালে দারুণ লাগছে। প্রিন্ট কোয়ালিটি অসাধারণ!', true),
    (1, 'Tanvir Hossain', 5, 'Colors are sharp and the canvas arrived well packed. Highly recommend.', true),
    (2, 'ফারজানা আক্তার', 5, 'বিসমিল্লাহ মেটাল আর্ট লাইভিং রুমে খুব সুন্দর দেখাচ্ছে।', true),
    (2, 'Imran Khan', 4, 'Metal finish looks premium. Mounting screws could be labeled better.', true),
    (3, 'সাবরিনা খান', 5, 'কাবা নাইট স্কাই ক্যানভাসের রঙ খুব গভীর ও শান্ত লাগে।', true),
    (3, 'Rafiul Islam', 4, 'Beautiful night theme print. Delivery was 4 days inside Dhaka.', true),
    (4, 'মাহমুদ হাসান', 5, 'ট্রিপটিচ সেট ওয়াইড ওয়ালে পারফেক্ট ফিট হয়েছে।', true),
    (4, 'Nusrat Jahan', 5, 'UV print quality is excellent — no fading near the window.', true),
    (5, 'আয়েশা সিদ্দিকা', 5, 'LED ক্যানভাস রাতে অন্য রকম আলো ছড়ায়, খুব পছন্দ হয়েছে।', true),
    (5, 'Shuvo Das', 4, 'LED adapter worked fine. Canvas thickness is good for the price.', true),
    (6, 'জাহিদুল ইসলাম', 4, 'অ্যাক্রিলিক লেটার সহজে লাগানো গেছে, সাইজ ঠিক আছে।', true),
    (6, 'Priya Sharma', 5, '3D letters look classy on our prayer corner wall.', true),
    (7, 'রুমা বেগম', 5, 'রমজান ল্যান্টার্ন সেট গেস্ট রুমে সবাই প্রশংসা করেছে।', true),
    (7, 'Arif Mahmud', 4, 'Seasonal design is lovely. Would buy again next Ramadan.', true),
    (8, 'সালমা খাতুন', 5, 'ফ্রেমড প্রিন্ট গিফট বক্সসহ এসেছে — উপহার দেওয়ার জন্য আদর্শ।', true),
    (8, 'David Chen', 5, 'Glass frame feels solid. Print is crisp and centered.', true),
    (9, 'Karim Ahmed', 5, 'Custom family canvas — photo clarity perfect. Fast delivery.', true),
    (9, 'নাজমা পারভীন', 5, '২৪x৩৬ সাইজে ফটো একদম ক্লিয়ার, রঙ হারায়নি।', true),
    (10, 'তানিয়া রহমান', 5, 'বিয়ের কাপল ক্যানভাস উপহার হিসেবে দিয়েছিলাম — সবাই খুশি।', true),
    (10, 'James Wilson', 4, 'Template layout is romantic. Took a week to arrive outside Dhaka.', true),
    (11, 'রেহানা আক্তার', 5, 'মেমোরিয়াল কোলাজ দেখে চোখে জল এসেছে — খুব সুন্দর কাজ।', true),
    (11, 'Kabir Hossain', 5, 'Vintage filter on collage photos looks natural, not over-edited.', true),
    (12, 'মিথিলা চৌধুরী', 5, 'বেবি ফুটপ্রিন্ট ক্যানভাস নার্সারিতে ঠিক মতো মানিয়েছে।', true),
    (12, 'Samira Khatun', 4, 'Pastel theme is soft and cute. Name spelling was correct.', true),
    (13, 'হাসান আলী', 5, 'বার্ষিকী স্প্লিট প্যানেল প্যানোরামা ফটোর জন্য পারফেক্ট।', true),
    (13, 'Elena Rodriguez', 5, 'Three panels align well. Packaging prevented any bends.', true),
    (14, 'নাফিসা ইসলাম', 5, 'কিডস রুমের ইউনিকর্ন আর্ট বাচ্চার খুব পছন্দ হয়েছে।', true),
    (14, 'Rakib Hasan', 5, 'Bright colors, child-safe feel. Hung it above the study desk.', true),
    (15, 'পলাশ মিয়া', 4, 'ডাইনোসর থিম আমার ছেলে কাঁদছিল না, এখন রুমে খেলছে!', true),
    (15, 'Anika Sultana', 5, 'Dino poster set is fun. Paper quality is thicker than expected.', true),
    (16, 'শিবলী রহমান', 5, 'মেয়ের নাম সহ প্রিন্সেস আর্ট — পার্সোনালাইজেশন ঠিক ছিল।', true),
    (16, 'Chris Taylor', 4, 'Eight themes to pick from is great. Colors match the preview.', true),
    (17, 'ওয়ালিউল হক', 4, 'অফিসে মোটিভেশনাল পোস্টার টিমের মনোযোগ ধরে রাখে।', true),
    (17, 'Farhana Begum', 5, 'A2 সাইজ ডেস্কের পাশে দারুণ লাগে, টেক্সট পড়তে স্পষ্ট।', true),
    (18, 'সুমন কর্মকার', 5, 'টিমওয়ার্ক ক্যানভাস মিটিং রুমে প্রফেশনাল লুক দিয়েছে।', true),
    (18, 'Michael Brown', 4, 'Neutral colors fit our corporate wall. Good value.', true)
) AS d(legacy_id, reviewer_name, rating, comment, is_verified)
  ON p.legacy_id = d.legacy_id
WHERE NOT EXISTS (
  SELECT 1 FROM reviews r
  WHERE r.product_id = p.id
    AND r.reviewer_name = d.reviewer_name
    AND r.comment = d.comment
);
