/**
 * @jest-environment jsdom
 */

import {
  Deployment,
  getDeployments,
  saveDeployments,
  addDeployment,
  updateDeployment,
  deleteDeployment,
  clearDeployments,
} from '../deployment-storage';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('deployment-storage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  describe('getDeployments', () => {
    it('should return empty array when no deployments exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const result = getDeployments();
      expect(result).toEqual([]);
    });

    it('should return deployments from localStorage', () => {
      const mockDeployments = [
        {
          id: '1',
          name: 'test-app',
          status: 'success',
          createdAt: '2023-01-01T00:00:00.000Z',
          repo: 'github.com/user/test-app',
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockDeployments));
      
      const result = getDeployments();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-app');
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = getDeployments();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('addDeployment', () => {
    it('should add a new deployment', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      const deploymentData = {
        name: 'new-app',
        status: 'success' as const,
        repo: 'github.com/user/new-app',
        url: 'https://new-app.com',
      };
      
      const result = addDeployment(deploymentData);
      
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.name).toBe('new-app');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('updateDeployment', () => {
    it('should update an existing deployment', () => {
      const existingDeployments = [
        {
          id: '1',
          name: 'test-app',
          status: 'pending',
          createdAt: '2023-01-01T00:00:00.000Z',
          repo: 'github.com/user/test-app',
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingDeployments));
      
      updateDeployment('1', { status: 'success', url: 'https://test-app.com' });
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].status).toBe('success');
      expect(savedData[0].url).toBe('https://test-app.com');
    });
  });

  describe('deleteDeployment', () => {
    it('should delete a deployment', () => {
      const existingDeployments = [
        {
          id: '1',
          name: 'test-app-1',
          status: 'success',
          createdAt: '2023-01-01T00:00:00.000Z',
          repo: 'github.com/user/test-app-1',
        },
        {
          id: '2',
          name: 'test-app-2',
          status: 'success',
          createdAt: '2023-01-01T00:00:00.000Z',
          repo: 'github.com/user/test-app-2',
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingDeployments));
      
      deleteDeployment('1');
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('2');
    });
  });

  describe('clearDeployments', () => {
    it('should clear all deployments', () => {
      clearDeployments();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('aveno_deployments');
    });
  });
});
