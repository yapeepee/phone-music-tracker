/**
 * Base Service Class
 * 
 * All services should extend this class to ensure consistent API usage
 * and automatic variable name transformation
 */

import { apiClient, handleApiError } from './api/client';
import { AxiosRequestConfig } from 'axios';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export abstract class BaseService {
  protected basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * GET request
   * Response will be automatically transformed from snake_case to camelCase
   */
  protected async get<T>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}${path}`, config);
    return response.data;
  }

  /**
   * GET request with pagination
   */
  protected async getPaginated<T>(
    path: string = '',
    params: PaginationParams = {},
    config?: AxiosRequestConfig
  ): Promise<PaginatedResponse<T>> {
    const response = await apiClient.get<PaginatedResponse<T>>(
      `${this.basePath}${path}`,
      {
        ...config,
        params: {
          skip: params.skip || 0,
          limit: params.limit || 20,
          ...config?.params,
        },
      }
    );
    return response.data;
  }

  /**
   * POST request
   * Request data will be automatically transformed from camelCase to snake_case
   * Response will be automatically transformed from snake_case to camelCase
   */
  protected async post<T>(path: string = '', data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<T>(`${this.basePath}${path}`, data, config);
    return response.data;
  }

  /**
   * PUT request
   * Request data will be automatically transformed from camelCase to snake_case
   * Response will be automatically transformed from snake_case to camelCase
   */
  protected async put<T>(path: string = '', data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<T>(`${this.basePath}${path}`, data, config);
    return response.data;
  }

  /**
   * PATCH request
   * Request data will be automatically transformed from camelCase to snake_case
   * Response will be automatically transformed from snake_case to camelCase
   */
  protected async patch<T>(path: string = '', data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch<T>(`${this.basePath}${path}`, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  protected async delete<T = void>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<T>(`${this.basePath}${path}`, config);
    return response.data;
  }

  /**
   * Build query string from params object
   * Useful for complex query parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, String(v)));
        } else {
          query.append(key, String(value));
        }
      }
    });
    
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
  }
}

/**
 * Example of how to use BaseService:
 * 
 * class UserService extends BaseService {
 *   constructor() {
 *     super('/users');
 *   }
 * 
 *   async getUser(id: string): Promise<User> {
 *     return this.get(`/${id}`);
 *   }
 * 
 *   async createUser(data: CreateUserInput): Promise<User> {
 *     return this.post('', data);
 *   }
 * 
 *   async getUsers(params: PaginationParams): Promise<PaginatedResponse<User>> {
 *     return this.getPaginated('', params);
 *   }
 * }
 */