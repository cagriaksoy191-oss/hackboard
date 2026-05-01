import React from 'react';

function TaskFilters({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterUser,
  setFilterUser,
  users,
  hasActiveFilters,
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="hidden sm:block text-xs text-secondary mb-1 opacity-0 select-none">Arama</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gorev ara..."
              className="w-full pl-10 pr-4 py-2 input-surface border rounded-xl text-sm focus:outline-none focus:border-accent transition-all duration-200"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-secondary mb-1">Durum</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full px-3 py-2 input-surface border rounded-xl text-sm focus:outline-none transition-all duration-200 ${
              filterStatus !== 'all' ? 'border-accent bg-accent/10' : ''
            }`}
          >
            <option value="all" className="option-surface">Tumu</option>
            <option value="todo" className="option-surface">Yapilacak</option>
            <option value="in-progress" className="option-surface">Devam Ediyor</option>
            <option value="testing" className="option-surface">Test</option>
            <option value="done" className="option-surface">Tamamlandi</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-secondary mb-1">Oncelik</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`w-full px-3 py-2 input-surface border rounded-xl text-sm focus:outline-none transition-all duration-200 ${
              filterPriority !== 'all' ? 'border-accent bg-accent/10' : ''
            }`}
          >
            <option value="all" className="option-surface">Tumu</option>
            <option value="critical" className="option-surface">Kritik</option>
            <option value="high" className="option-surface">Yuksek</option>
            <option value="medium" className="option-surface">Orta</option>
            <option value="low" className="option-surface">Dusuk</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-secondary mb-1">Kisi</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={`w-full px-3 py-2 input-surface border rounded-xl text-sm focus:outline-none transition-all duration-200 ${
              filterUser !== 'all' ? 'border-accent bg-accent/10' : ''
            }`}
          >
            <option value="all" className="option-surface">Tumu</option>
            {users.map((u) => (
              <option key={u.id} value={u.id} className="option-surface">{u.name}</option>
            ))}
          </select>
        </div>
      </div>
      {hasActiveFilters && (
        <button
          onClick={() => {
            setSearchQuery('');
            setFilterStatus('all');
            setFilterPriority('all');
            setFilterUser('all');
          }}
          className="px-3 py-1.5 bg-error/20 border border-error/30 text-error text-xs rounded-lg hover:bg-error/30 transition-all duration-200"
        >
          Filtreleri Temizle
        </button>
      )}
    </div>
  );
}

export default TaskFilters;
