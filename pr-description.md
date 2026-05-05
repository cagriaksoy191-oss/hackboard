💡 What: KanbanBoard bileşenindeki `filterTasks` fonksiyonu `useMemo` hook'u ile sarmalandı.
🎯 Why: Sürükle-bırak (`draggedTaskId`, `highlightColumn`) veya yanıp sönme efektleri (`pulseTaskId`) gibi filtreleme ile ilgisi olmayan state değişikliklerinde, tüm görev listesinin her render işleminde gereksiz yere baştan filtrelenmesini engellemek için.
📊 Impact: Sürükle-bırak sırasında ve diğer bileşen içi etkileşimlerde render performansını artırır ve gereksiz işlemci yükünü azaltır.
🔬 Measurement: Kanban panosunda çok sayıda görev varken sürükle-bırak işlemleri sırasında React DevTools profiler ile render süreleri kontrol edilebilir.
