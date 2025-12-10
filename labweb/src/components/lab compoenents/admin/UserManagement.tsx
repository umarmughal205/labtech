import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter as UIDialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, User, Lock, Mail, UserCog, X, Eye, EyeOff } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type UserRole = string;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

interface Permission {
  id: string;
  name: string;
  view: boolean;
  edit: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

// Modules available for permissions
const PERMISSION_MODULES: string[] = [
  'Dashboard',
  'Samples',
  'Patients',
  'Analyzer Results',
  'QC Management',
  'Reports',
  'User Management',
  'Settings',
];

const UserManagement: React.FC = () => {
  // State for users, roles and per-user permissions
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(''); // holds selected user id in User Permissions section
  const [userPermissions, setUserPermissions] = useState<Record<string, Permission[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State for modals
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Form states
  const [userForm, setUserForm] = useState<Partial<User> & { password: string }>({ 
    name: '', 
    email: '', 
    role: '',
    password: '',
    status: 'Active'
  });

  // Fetch initial data from localStorage instead of mock arrays
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('labUsers');
      const storedRoles = localStorage.getItem('labRoles');
      const parsedUsers: User[] = storedUsers ? JSON.parse(storedUsers) : [];
      const parsedRoles: Role[] = storedRoles ? JSON.parse(storedRoles) : [];

      setUsers(Array.isArray(parsedUsers) ? parsedUsers : []);
      setRoles(Array.isArray(parsedRoles) ? parsedRoles : []);
      setSelectedRoleId('');
    } catch (error) {
      console.error('Error loading user/role data from storage:', error);
      setUsers([]);
      setRoles([]);
      setSelectedRoleId('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist users and roles to localStorage whenever they change so they act as mock data
  useEffect(() => {
    try {
      localStorage.setItem('labUsers', JSON.stringify(users));
      localStorage.setItem('labRoles', JSON.stringify(roles));
    } catch {
      // ignore storage errors
    }
  }, [users, roles]);

  // Handle user form changes
  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionId: string, field: 'view' | 'edit' | 'delete') => {
    setRoles(prevRoles => {
      return prevRoles.map(role => {
        if (role.id === selectedRoleId) {
          return {
            ...role,
            permissions: role.permissions.map(permission => {
              if (permission.id === permissionId) {
                return { ...permission, [field]: !permission[field] };
              }
              return permission;
            })
          };
        }
        return role;
      });
    });
  };

  // Handle toggles directly in the User Permissions table (per-user)
  const handleUserPermissionToggle = (userId: string, permissionName: string, field: 'view' | 'edit' | 'delete') => {
    setUserPermissions(prev => {
      const existing = prev[userId] || [];
      const found = existing.find((p) => p.name === permissionName);

      if (found) {
        return {
          ...prev,
          [userId]: existing.map((p) =>
            p.name === permissionName ? { ...p, [field]: !p[field] } : p
          ),
        };
      }

      return {
        ...prev,
        [userId]: [
          ...existing,
          {
            id: Math.random().toString(36).substr(2, 9),
            name: permissionName,
            view: field === 'view',
            edit: field === 'edit',
            delete: field === 'delete',
          },
        ],
      };
    });
  };

  // Handle user form submission
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userForm.id) {
      // Update existing user
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userForm.id 
            ? { 
                ...user, 
                name: userForm.name || '',
                email: userForm.email || '',
                role: userForm.role || 'Lab Technician',
                status: userForm.status || 'Active'
              } 
            : user
        )
      );
    } else {
      // Create new user
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9), // Generate a simple ID
        name: userForm.name || '',
        email: userForm.email || '',
        role: userForm.role || 'Lab Technician',
        status: 'Active',
        lastLogin: 'Just now'
      };
      setUsers(prevUsers => [...prevUsers, newUser]);
    }
    
    // Reset form and close modal (no auto-filled values)
    setUserForm({ name: '', email: '', role: '', password: '', status: 'Active' });
    setIsUserModalOpen(false);
  };

  // State for role form
  const [roleForm, setRoleForm] = useState<Partial<Role> & { name: string }>({ 
    id: '',
    name: '',
    permissions: []
  });

  // Handle role form changes
  const handleRoleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRoleForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle role form submission
  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (roleForm.id) {
      // Update existing role (for global role management / Add User role list)
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.id === roleForm.id 
            ? { 
                ...role, 
                name: roleForm.name || '',
                permissions: roleForm.permissions || []
              } 
            : role
        )
      );
    } else {
      // Create new role (used for Add User role dropdown and global roles)
      const newRole: Role = {
        id: Math.random().toString(36).substr(2, 9),
        name: roleForm.name || 'New Role',
        permissions: roleForm.permissions || []
      };
      setRoles(prevRoles => [...prevRoles, newRole]);

      // If Add User dialog is open, auto-select the newly created role
      if (isUserModalOpen) {
        setUserForm(prev => ({
          ...prev,
          role: newRole.name as UserRole,
        }));
      }
    }

    // Also store permissions for the currently selected user in the User Permissions section
    if (selectedRoleId) {
      const userForPermissions = users.find((u) => u.id === selectedRoleId);
      if (userForPermissions) {
        setUserPermissions(prev => ({
          ...prev,
          [userForPermissions.id]: roleForm.permissions || [],
        }));
      }
    }
    
    // Reset form and close modal
    setRoleForm({ id: '', name: '', permissions: [] });
    setIsRoleModalOpen(false);
  };

  // Handle role deletion
  const handleDeleteRole = (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));
      if (selectedRoleId === roleId) {
        setSelectedRoleId('');
      }
    }
  };

  // Handle permission toggle for role form
  const handleRolePermissionToggle = (permissionName: string, field: 'view' | 'edit' | 'delete') => {
    setRoleForm(prev => {
      const permissions = [...(prev.permissions || [])];
      const existingPermission = permissions.find(p => p.name === permissionName);
      
      if (existingPermission) {
        return {
          ...prev,
          permissions: permissions.map(p => 
            p.name === permissionName 
              ? { ...p, [field]: !p[field] }
              : p
          )
        };
      } else {
        return {
          ...prev,
          permissions: [
            ...permissions,
            { 
              id: Math.random().toString(36).substr(2, 9),
              name: permissionName,
              view: field === 'view',
              edit: field === 'edit',
              delete: field === 'delete'
            }
          ]
        };
      }
    });
  };

  // Get current user context and permissions for the User Permissions section
  const selectedUser = users.find(user => user.id === selectedRoleId);
  const currentUserPermissions = selectedUser ? (userPermissions[selectedUser.id] || []) : [];
  const hasUserPermissionsConfig = !!(selectedUser && userPermissions[selectedUser.id]);
  const currentUserPermissionsFull: Permission[] = selectedUser
    ? PERMISSION_MODULES.map((moduleName) => {
        const existing = currentUserPermissions.find((p) => p.name === moduleName);
        return (
          existing || {
            id: Math.random().toString(36).substr(2, 9),
            name: moduleName,
            view: false,
            edit: false,
            delete: false,
          }
        );
      })
    : [];

  const roleOptions: string[] = Array.from(
    new Set([
      'Lab Supervisor',
      'Pathologist',
      'Lab Technician',
      'Receptionist',
      ...roles.map((r) => r.name),
    ])
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Role Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Create and view available roles</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-role-name">Role Name</Label>
              <Input
                id="new-role-name"
                placeholder="Enter role name"
                value={roleForm.name}
                onChange={handleRoleFormChange}
                name="name"
              />
            </div>
            <Button
              type="button"
              className="sm:w-auto w-full mt-2 sm:mt-0"
              onClick={() => {
                const trimmedName = (roleForm.name || '').trim();
                if (!trimmedName) return;

                const newRole: Role = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: trimmedName,
                  permissions: [],
                };

                setRoles(prev => [...prev, newRole]);

                // If Add User dialog is open, allow selecting this new role
                if (isUserModalOpen) {
                  setUserForm(prev => ({
                    ...prev,
                    role: trimmedName as UserRole,
                  }));
                }

                setRoleForm(prev => ({ ...prev, id: '', name: '', permissions: [] }));
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Role
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Existing Roles</Label>
            <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2 rounded border border-dashed"
                  >
                    <span className="font-medium text-sm">{role.name}</span>
                    <Badge variant="outline" className="text-xs">Role</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No roles yet. Add a role to get started.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </div>
          <Button
            onClick={() => {
              // Open Add User with empty fields (no auto-filled values)
              setUserForm({ name: '', email: '', role: '', password: '', status: 'Active' });
              setIsUserModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'Lab Supervisor' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`h-2.5 w-2.5 rounded-full mr-2 ${user.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      {user.status}
                    </div>
                  </TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mr-2 hover:bg-blue-100"
                      onClick={() => {
                        // Set the form with user data for editing
                        setUserForm({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role,
                          status: user.status,
                          password: '' // Don't show password for security
                        });
                        setIsUserModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit user</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-red-100 hover:text-red-700"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
                          // Remove the user from the users array
                          setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
                          // If the deleted user is currently selected, clear the selection
                          if (selectedRoleId === user.id) {
                            setSelectedRoleId('');
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete user</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Users & Permissions Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Permissions</CardTitle>
              <CardDescription>Manage user-specific permissions</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedRoleId} 
                onValueChange={(value) => {
                  setSelectedRoleId(value);
                  // Find the selected user and update the form
                  const selectedUser = users.find(user => user.id === value);
                  if (selectedUser) {
                    setUserForm({
                      ...userForm,
                      id: selectedUser.id,
                      name: selectedUser.name,
                      email: selectedUser.email,
                      role: selectedUser.role,
                      status: selectedUser.status
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>{user.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => {
                  // Initialize dialog with current user's permissions so it matches the table
                  const permissionsForUser = selectedUser ? (userPermissions[selectedUser.id] || []) : [];
                  setRoleForm({ id: '', name: '', permissions: permissionsForUser });
                  setIsRoleModalOpen(true);
                }}
              >
                <UserCog className="mr-2 h-4 w-4" /> Manage Permission
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasUserPermissionsConfig && (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Module</TableHead>
                      <TableHead className="text-center">View</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUserPermissionsFull.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">{permission.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={permission.view}
                            onCheckedChange={() => selectedUser && handleUserPermissionToggle(selectedUser.id, permission.name, 'view')}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={permission.edit}
                            onCheckedChange={() => selectedUser && handleUserPermissionToggle(selectedUser.id, permission.name, 'edit')}
                            disabled={!permission.view}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={permission.delete}
                            onCheckedChange={() => selectedUser && handleUserPermissionToggle(selectedUser.id, permission.name, 'delete')}
                            disabled={!permission.view || !permission.edit}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button>Save Permissions</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Role Modal (same layout style as Barcodes view dialog) */}
      <Dialog
        open={isRoleModalOpen}
        onOpenChange={(open) => {
          setIsRoleModalOpen(open);
          if (!open) {
            setRoleForm({ id: '', name: '', permissions: [] });
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <form onSubmit={handleRoleSubmit} className="flex flex-col min-h-0">
            <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
              <div className="space-y-1 text-left">
                <DialogTitle>{roleForm.id ? 'Edit Permission' : 'Add New Permission'}</DialogTitle>
                <DialogDescription>
                  Configure permissions and access levels.
                </DialogDescription>
                {selectedUser && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Manage Permission for: <span className="font-medium">{selectedUser.name}</span>{' '}
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ml-1">
                      {selectedUser.role}
                    </span>
                  </div>
                )}
              </div>
            </DialogHeader>

            <CardContent className="space-y-6 overflow-y-auto p-6">
                <div className="space-y-2 hidden">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    name="name"
                    value={roleForm.name}
                    onChange={handleRoleFormChange}
                    placeholder="Enter role name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Module</TableHead>
                          <TableHead className="text-center">View</TableHead>
                          <TableHead className="text-center">Edit</TableHead>
                          <TableHead className="text-center">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          'Dashboard',
                          'Samples',
                          'Patients',
                          'Analyzer Results',
                          'QC Management',
                          'Reports',
                          'User Management',
                          'Settings',
                        ].map((module) => {
                          const permission = roleForm.permissions?.find(p => p.name === module) || {
                            view: false,
                            edit: false,
                            delete: false
                          };
                          
                          return (
                            <TableRow key={module}>
                              <TableCell className="font-medium">{module}</TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={permission.view}
                                  onCheckedChange={() => handleRolePermissionToggle(module, 'view')}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={permission.edit}
                                  onCheckedChange={() => handleRolePermissionToggle(module, 'edit')}
                                  disabled={!permission.view}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={permission.delete}
                                  onCheckedChange={() => handleRolePermissionToggle(module, 'delete')}
                                  disabled={!permission.view || !permission.edit}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                
              </CardContent>
              <UIDialogFooter className="flex flex-row items-center justify-between gap-3 border-t bg-background/80 backdrop-blur-sm px-6 py-4">
                <div>
                  {roleForm.id && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setRoleForm({ id: '', name: '', permissions: [] })}
                    >
                      <Plus className="h-4 w-4 mr-2" /> New Role
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsRoleModalOpen(false);
                      setRoleForm({ id: '', name: '', permissions: [] });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {roleForm.id ? 'Update Permission' : 'Add Permission'}
                  </Button>
                </div>
              </UIDialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Add/Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{userForm.id ? 'Edit User' : 'Add New User'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleUserSubmit} autoComplete="off">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="off"
                    value={userForm.name}
                    onChange={handleUserFormChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    value={userForm.email}
                    onChange={handleUserFormChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    name="role"
                    value={userForm.role}
                    onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value as UserRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((roleName) => (
                        <SelectItem key={roleName} value={roleName}>
                          {roleName}
                        </SelectItem>
                      ))}
                      <div className="border-t mt-1 pt-2 px-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-center"
                          onClick={() => {
                            setIsRoleModalOpen(true);
                            setRoleForm({ id: '', name: '', permissions: [] });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add New Role
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                {!userForm.id && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        placeholder="Enter password"
                        required={!userForm.id}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {userForm.id ? 'Update User' : 'Add User'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;