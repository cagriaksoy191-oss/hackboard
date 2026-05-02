export const statusColors = {
  todo: '#3b82f6',
  'in-progress': '#f59e0b',
  testing: '#8b5cf6',
  done: '#10b981',
};

export const statusLabels = {
  todo: 'Yapilacak',
  'in-progress': 'Devam Ediyor',
  testing: 'Test',
  done: 'Tamamlandi',
};

export const formatPieData = (taskStatusDist) => {
  if (!taskStatusDist) return [];
  return taskStatusDist.map((d) => ({
    name: statusLabels[d.status] || d.status,
    value: d.count,
    color: statusColors[d.status] || '#666',
  }));
};

export const formatBarData = (tasksByUser) => {
  if (!tasksByUser) return [];
  return tasksByUser.map((u) => ({
    name: u.name.split(' ')[0],
    completed: u.completed || 0,
    total: u.total || 0,
  }));
};

export const formatLineData = (hourlyProductivity) => {
  if (!hourlyProductivity) return [];
  return hourlyProductivity.map((h) => ({
    hour: `${h.hour}:00`,
    completed: h.completed,
  }));
};

export const exportJSON = (tasks, addToast) => {
  const exportData = tasks.map((t) => ({
    id: t.id,
    baslik: t.title,
    durum: statusLabels[t.status] || t.status,
    oncelik: t.priority,
    atanan_kisi: t.assigned_name || 'Atanmamis',
    olusturma_tarihi: t.created_at,
    guncelleme_tarihi: t.updated_at,
    tahmini_sure: t.estimated_hours,
    harcanan_sure: t.actual_hours,
  }));
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hackboard-rapor-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  if (addToast) addToast('JSON raporu basariyla indirildi!', 'success');
};

export const exportCSV = (tasks, addToast) => {
  const headers = ['ID', 'Baslik', 'Durum', 'Oncelik', 'Atanan Kisi', 'Olusturma Tarihi', 'Guncelleme Tarihi', 'Tahmini Sure', 'Harcanan Sure'];
  const rows = tasks.map((t) => [
    t.id,
    `"${t.title}"`,
    statusLabels[t.status] || t.status,
    t.priority,
    `"${t.assigned_name || 'Atanmamis'}"`,
    t.created_at,
    t.updated_at || '',
    t.estimated_hours,
    t.actual_hours,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hackboard-rapor-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (addToast) addToast('CSV raporu basariyla indirildi!', 'success');
};
