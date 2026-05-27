import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Check, Edit2, Loader2, Plus, Trash2, UserCog, X } from 'lucide-react';
import type { User } from '../services/api';
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import './ApiKeys.css';
import './Users.css';

const roles = ['admin', 'operator', 'viewer'] as const;
const emptyForm = {
  username: '',
  displayName: '',
  password: '',
  role: 'viewer' as User['role'],
};

const columnHelper = createColumnHelper<User>();

export function Users() {
  useDocumentTitle('Users');
  const { data: users = [], isLoading } = useUsersQuery();
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', role: 'viewer' as User['role'], isActive: true, password: '' });
  const [error, setError] = useState('');

  const openEdit = (user: User) => {
    setEditing(user);
    setEditForm({
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      password: '',
    });
    setError('');
  };

  const handleCreate = async () => {
    setError('');
    try {
      await createMutation.mutateAsync(form);
      setForm(emptyForm);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setError('');
    try {
      const data = {
        displayName: editForm.displayName,
        role: editForm.role,
        isActive: editForm.isActive,
        ...(editForm.password ? { password: editForm.password } : {}),
      };
      await updateMutation.mutateAsync({ id: editing.id, data });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    setError('');
    try {
      await deleteMutation.mutateAsync(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('displayName', {
        header: () => 'Name',
        cell: info => (
          <span className="user-name-cell">
            <strong>{info.getValue()}</strong>
            <small>@{info.row.original.username}</small>
          </span>
        ),
      }),
      columnHelper.accessor('role', {
        header: () => 'Role',
        cell: info => <span className="permission-badge">{info.getValue()}</span>,
      }),
      columnHelper.accessor('isActive', {
        header: () => 'Status',
        cell: info => (
          <span className={`status-badge ${info.getValue() ? 'active' : 'inactive'}`}>
            {info.getValue() ? 'Active' : 'Disabled'}
          </span>
        ),
      }),
      columnHelper.accessor('lastLoginAt', {
        header: () => 'Last Login',
        cell: info => (info.getValue() ? new Date(info.getValue()!).toLocaleString() : 'Never'),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => 'Actions',
        cell: info => {
          const user = info.row.original;
          return (
            <span className="actions-cell">
              <button className="icon-btn" onClick={() => openEdit(user)} title="Edit user">
                <Edit2 size={16} />
              </button>
              <button className="icon-btn danger" onClick={() => handleDelete(user)} title="Delete user">
                <Trash2 size={16} />
              </button>
            </span>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="api-keys-page users-page loading-panel">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="api-keys-page users-page">
      <PageHeader
        title="Users"
        subtitle="Manage dashboard users and admin access"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            New User
          </button>
        }
      />

      {error && <div className="user-error">{error}</div>}

      <div className="api-keys-content">
        <div className="keys-table-container">
          {users.length === 0 ? (
            <div className="empty-table-state">
              <UserCog size={48} strokeWidth={1} />
              <h3>No users found</h3>
              <p>Create a user to let team members join the dashboard.</p>
            </div>
          ) : (
            <table className="keys-table users-table">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="table-row header">
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="table-row">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(showCreate || editing) && (
        <div className="modal-overlay" onClick={() => (editing ? setEditing(null) : setShowCreate(false))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit User' : 'Create User'}</h2>
              <button className="btn-icon" onClick={() => (editing ? setEditing(null) : setShowCreate(false))}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body user-form">
              {!editing && (
                <>
                  <label>Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    placeholder="operator1"
                  />
                </>
              )}
              <label>Name</label>
              <input
                type="text"
                value={editing ? editForm.displayName : form.displayName}
                onChange={e =>
                  editing
                    ? setEditForm({ ...editForm, displayName: e.target.value })
                    : setForm({ ...form, displayName: e.target.value })
                }
                placeholder="Operations User"
              />
              <label>Role</label>
              <select
                value={editing ? editForm.role : form.role}
                onChange={e =>
                  editing
                    ? setEditForm({ ...editForm, role: e.target.value as User['role'] })
                    : setForm({ ...form, role: e.target.value as User['role'] })
                }
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {editing && (
                <label className="user-checkbox">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                  />
                  Active
                </label>
              )}
              <label>{editing ? 'New Password (optional)' : 'Password'}</label>
              <input
                type="password"
                value={editing ? editForm.password : form.password}
                onChange={e =>
                  editing
                    ? setEditForm({ ...editForm, password: e.target.value })
                    : setForm({ ...form, password: e.target.value })
                }
                placeholder="At least 8 characters"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => (editing ? setEditing(null) : setShowCreate(false))}>
                Cancel
              </button>
              <button className="btn-primary" onClick={editing ? handleUpdate : handleCreate}>
                <Check size={16} />
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
