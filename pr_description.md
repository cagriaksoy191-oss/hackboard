🎯 **What:** `server/server.js` dosyasındaki `console.log` ifadeleri `console.info` olarak değiştirildi. Test ortamındaki hata giderilerek (gerekli `db.js` fonksiyonları export edildi) test sürecinin sorunsuz geçmesi sağlandı.

💡 **Why:** Bu değişiklik logların anlamsal (semantic) doğruluğunu artırarak kodun okunabilirliğini ve maintainability'sini iyileştirir; ayrıca console çıktı yönetimi için daha doğru bir kullanım alışkanlığı sunar.

✅ **Verification:**
- `npm --prefix client run test` çalıştırılarak tüm istemci testlerinin geçtiği (`pass 38, fail 0`) doğrulandı.
- `cd server && node --test` çalıştırılarak testlerin başarılı (`pass 4, fail 0`) olduğu teyit edildi. Testleri çalıştırırken karşılaşılan eksik export hatası, `db.js` güncellenerek giderildi.
- Sunucu ve istemci `npm run dev` ile eşzamanlı çalıştırılarak backend'in ayağa kalktığı ve istekleri karşıladığı curl ile doğrulandı.
- Üretim ortamı (`npm run build` ile `prod`) ve sunucunun graceful shutdown mekanizmasının (sinyal ile kapatma, flush db vs.) logları test edildi ve çalışır durumda olduğu görüldü.

✨ **Result:** Hiçbir davranış değişikliği olmaksızın daha temiz ve daha doğru bir loglama sistemine geçilmiş oldu. Sunucu kapatma ve açma sinyalleri ile olay logları başarıyla `console.info` ile yazdırılıyor.
