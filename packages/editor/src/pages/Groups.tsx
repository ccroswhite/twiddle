import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, X, Workflow, UserPlus, UserMinus, Edit2, Save, ChevronLeft, ShieldCheck } from 'lucide-react';
import { groupsApi, usersApi, type Group, type GroupMember, type User } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function Groups() {
  const { user: currentUser } = useAuth();
  const isSystemAdmin = currentUser?.isAdmin ?? false;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', isDefault: false });

  // Selected group for detail view
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Edit group state
  const [editingGroup, setEditingGroup] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', isDefault: false });

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  // Permission helpers
  const canCreateGroups = isSystemAdmin;
  const canDeleteGroups = isSystemAdmin;
  const canManageMembers = (groupRole?: string) => isSystemAdmin || groupRole === 'admin' || groupRole === 'owner';
  const canAssignAdminRole = isSystemAdmin;
  const canEditGroup = (groupRole?: string) => isSystemAdmin || groupRole === 'admin' || groupRole === 'owner';

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers(groupId: string) {
    setMembersLoading(true);
    try {
      const data = await groupsApi.listMembers(groupId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await usersApi.list();
      setAllUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  async function handleCreate() {
    if (!newGroup.name) return;

    try {
      await groupsApi.create(newGroup);
      setNewGroup({ name: '', description: '', isDefault: false });
      setShowCreate(false);
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await groupsApi.delete(id);
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
      }
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  }

  async function handleUpdateGroup() {
    if (!selectedGroup || !editForm.name) return;

    try {
      await groupsApi.update(selectedGroup.id, editForm);
      setEditingGroup(false);
      loadGroups();
      // Update selected group
      setSelectedGroup({ ...selectedGroup, ...editForm });
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  }

  async function handleAddMember() {
    if (!selectedGroup || !selectedUserId) return;

    try {
      await groupsApi.addMember(selectedGroup.id, selectedUserId, selectedRole);
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('member');
      loadMembers(selectedGroup.id);
      loadGroups(); // Refresh member count
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedGroup) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await groupsApi.removeMember(selectedGroup.id, memberId);
      loadMembers(selectedGroup.id);
      loadGroups(); // Refresh member count
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }

  async function handleUpdateMemberRole(memberId: string, newRole: string) {
    if (!selectedGroup) return;

    try {
      await groupsApi.updateMember(selectedGroup.id, memberId, newRole);
      loadMembers(selectedGroup.id);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  }

  function openGroupDetails(group: Group) {
    setSelectedGroup(group);
    setEditForm({ name: group.name, description: group.description || '', isDefault: group.isDefault });
    setEditingGroup(false);
    loadMembers(group.id);
  }

  function openAddMember() {
    loadUsers();
    setShowAddMember(true);
  }

  // Get users not already in the group
  const availableUsers = allUsers.filter(
    user => !members.some(member => member.user.id === user.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Group Detail View
  if (selectedGroup) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedGroup(null)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Groups
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              {editingGroup ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-xl font-bold px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description"
                    className="text-sm px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.isDefault}
                      onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    Default group for new users
                  </label>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">{selectedGroup.name}</h1>
                    {selectedGroup.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {selectedGroup.description && (
                    <p className="text-slate-500 mt-1">{selectedGroup.description}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingGroup ? (
                <>
                  <button
                    onClick={() => setEditingGroup(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateGroup}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  {canEditGroup(selectedGroup.role) && (
                    <button
                      onClick={() => setEditingGroup(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {canDeleteGroups && !selectedGroup.isDefault && (
                    <button
                      onClick={() => handleDelete(selectedGroup.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-slate-200 pt-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {members.length} members
            </span>
            <span className="flex items-center gap-1">
              <Workflow className="w-4 h-4" />
              {selectedGroup.workflowCount || 0} workflows
            </span>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Members</h2>
            {canManageMembers(selectedGroup.role) && (
              <button
                onClick={openAddMember}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No members yet</p>
              <button
                onClick={openAddMember}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2"
              >
                Add the first member
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {members.map((member) => {
                const isSelf = member.user.id === currentUser?.id;
                const canRemove = canManageMembers(selectedGroup?.role) || isSelf;
                const canChangeRole = canManageMembers(selectedGroup?.role);
                // Only system admin can assign/remove admin role
                const canSetAdmin = canAssignAdminRole;

                return (
                  <div key={member.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {member.user.name || member.user.email.split('@')[0]}
                          </span>
                          {member.role === 'admin' && (
                            <span title="Group Admin">
                              <ShieldCheck className="w-4 h-4 text-amber-500" />
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-xs text-slate-400">(you)</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">{member.user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canChangeRole ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                          className="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={member.role === 'admin' && !canSetAdmin}
                        >
                          <option value="member">Member</option>
                          {canSetAdmin && <option value="admin">Group Admin</option>}
                          {!canSetAdmin && member.role === 'admin' && <option value="admin">Group Admin</option>}
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="px-2 py-1 text-sm text-slate-500 capitalize">{member.role}</span>
                      )}
                      {canRemove && !(selectedGroup?.isDefault && isSelf) && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={isSelf ? "Leave group" : "Remove member"}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Add Member</h2>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {availableUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  All users are already members of this group.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      User
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a user...</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="member">Member</option>
                      {canAssignAdminRole && <option value="admin">Group Admin</option>}
                      <option value="viewer">Viewer</option>
                    </select>
                    {!canAssignAdminRole && (
                      <p className="text-xs text-slate-500 mt-1">
                        Only system administrators can assign the Group Admin role
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Groups List View
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 mt-1">Manage groups and team access to workflows</p>
        </div>
        {canCreateGroups && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Group
          </button>
        )}
      </div>

      {/* Groups List */}
      <div className="grid gap-4">
        {groups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No groups yet</h3>
            <p className="text-slate-500 mb-4">
              {canCreateGroups
                ? 'Create a group to organize your workflows and team members'
                : 'Contact an administrator to create groups'}
            </p>
            {canCreateGroups && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create your first group
              </button>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              onClick={() => openGroupDetails(group)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{group.name}</h3>
                      {group.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          Default
                        </span>
                      )}
                      {group.role && group.role !== 'member' && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${group.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          } capitalize`}>
                          {group.role === 'admin' ? 'Group Admin' : group.role}
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-slate-500 mt-1">{group.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {group.memberCount || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Workflow className="w-4 h-4" />
                        {group.workflowCount || 0} workflows
                      </span>
                    </div>
                  </div>
                </div>
                {canDeleteGroups && !group.isDefault && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(group.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Create New Group</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Engineering Team"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newGroup.isDefault}
                  onChange={(e) => setNewGroup({ ...newGroup, isDefault: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-700">
                  Make this the default group for new users
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newGroup.name}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
