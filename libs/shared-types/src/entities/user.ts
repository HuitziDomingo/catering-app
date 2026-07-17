export interface User {
  id: string;
  roleId: number;
  fullName: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateUserDto {
  roleId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  passwordHash: string;
  isActive?: boolean;
}

export interface UpdateUserDto {
  roleId?: number;
  fullName?: string;
  email?: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  passwordHash?: string;
  isActive?: boolean;
}
