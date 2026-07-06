import { useState, useEffect, useMemo } from 'react';
import { tasksAPI, usersAPI } from '../lib/api';
import socket from '../lib/socket';
import TaskForm from './TaskForm';
import Modal from './common/Modal';
import { Button } from './atoms';
import Badge from './atoms/Badge';

function EditTaskModal({ task, onClose, onSuccess, isOpen }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    estimated_hours: '',
  });

  const [conflictData, setConflictData] = useState(null);
  const [isDeletedConflict, setIsDeletedConflict] = useState(false);

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data));
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        estimated_hours: task.estimated_hours || '',
      });
    }
    setConflictData(null);
    setIsDeletedConflict(false);
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.update(task.id, {
        ...form,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        estimated_hours: parseFloat(form.estimated_hours) || 0,
        version: task.version, // Pass version for optimistic locking
      });
      onSuccess();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setConflictData(err.response.data.currentTask);
      } else if (err.response && err.response.status === 404) {
        setIsDeletedConflict(true);
      } else {
        console.error('Update task error:', err);
      }
    }
  };

  const handleSaveMerged = async () => {
    try {
      await tasksAPI.update(task.id, {
        ...form,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        estimated_hours: parseFloat(form.estimated_hours) || 0,
        version: conflictData.version, // Overwrite with server version
      });
      onSuccess();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setConflictData(err.response.data.currentTask);
      } else if (err.response && err.response.status === 404) {
        setIsDeletedConflict(true);
        setConflictData(null);
      }
    }
  };

  const handleRecreate = async () => {
    try {
      await tasksAPI.create({
        ...form,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        estimated_hours: parseFloat(form.estimated_hours) || 0,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to recreate task:', err);
    }
  };

  const handleDiscard = () => {
    onSuccess();
  };

  const diffFields = useMemo(() => {
    if (!conflictData) return [];
    const diffs = [];
    const fields = [
      { key: 'title', label: 'Başlık' },
      { key: 'description', label: 'Açıklama' },
      { key: 'priority', label: 'Öncelik' },
      { key: 'assigned_to', label: 'Atanan Kişi' },
      { key: 'estimated_hours', label: 'Tahmini Süre' },
    ];
    fields.forEach((f) => {
      let formVal = form[f.key];
      let confVal = conflictData[f.key];
      if (f.key === 'assigned_to') {
        formVal = formVal ? parseInt(formVal) : null;
        confVal = confVal ? parseInt(confVal) : null;
      }
      if (f.key === 'estimated_hours') {
        formVal = parseFloat(formVal) || 0;
        confVal = parseFloat(confVal) || 0;
      }
      if (formVal !== confVal) {
        diffs.push({
          key: f.key,
          label: f.label,
          formValue: formVal,
          confValue: confVal,
        });
      }
    });
    return diffs;
  }, [form, conflictData]);

  const getUserName = (id) => {
    const u = users.find((x) => x.id === parseInt(id));
    return u ? u.name : 'Atanmamış';
  };

  // Render Deleted Warning State
  if (isDeletedConflict) {
    return (
      <Modal title="Görev Silinmiş" onClose={handleDiscard} isOpen={isOpen}>
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--accent-danger-muted)] border border-[var(--accent-danger)]/15 p-4 flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <h4 className="text-[13px] font-bold text-[var(--accent-danger)]">Bu Görev Silinmiş</h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Düzenlemeye çalıştığınız görev başka bir kullanıcı tarafından silinmiş. Değişikliklerinizi korumak için görevi yeniden oluşturabilir veya değişiklikleri iptal edebilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button variant="secondary" size="md" onClick={handleDiscard} className="flex-1">
              Değişiklikleri İptal Et
            </Button>
            <Button variant="accent" size="md" onClick={handleRecreate} className="flex-1">
              Görevi Yeniden Oluştur
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Render Merge Conflict State
  if (conflictData) {
    return (
      <Modal title="Çakışma Algılandı" onClose={onClose} isOpen={isOpen}>
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--accent-warning-muted)] border border-[var(--accent-warning)]/15 p-4 flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <h4 className="text-[13px] font-bold text-[var(--accent-warning)]">Veri Çakışması</h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Bu görev siz düzenleme yaparken başka bir kullanıcı tarafından güncellenmiş. Lütfen hangi alanları kaydetmek istediğinizi seçin.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {diffFields.map((field) => (
              <div key={field.key} className="border border-[var(--border-default)] rounded-xl p-3 bg-[var(--bg-card)] space-y-2">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                  {field.label}
                </span>
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Your Version */}
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, [field.key]: field.formValue }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form[field.key] === field.formValue
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-[var(--text-muted)] block mb-1 uppercase">Sizin Değişikliğiniz</span>
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">
                      {field.key === 'assigned_to' ? getUserName(field.formValue) : String(field.formValue || 'Boş')}
                    </span>
                  </button>

                  {/* Server Version */}
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, [field.key]: field.confValue }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form[field.key] === field.confValue
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-[var(--text-muted)] block mb-1 uppercase">Sunucudaki Değişiklik</span>
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">
                      {field.key === 'assigned_to' ? getUserName(field.confValue) : String(field.confValue || 'Boş')}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button variant="secondary" size="md" onClick={() => setConflictData(null)} className="flex-1">
              Geri Dön
            </Button>
            <Button variant="accent" size="md" onClick={handleSaveMerged} className="flex-1">
              Değişiklikleri Birleştir ve Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Görevi Düzenle" onClose={onClose} isOpen={isOpen}>
      <TaskForm
        form={form}
        setForm={setForm}
        users={users}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitText="Kaydet"
      />
    </Modal>
  );
}

export default EditTaskModal;
