import { useState, useEffect, useCallback } from 'react';
import { 
  Deployment, 
  getDeployments, 
  addDeployment as addDeploymentToStorage,
  updateDeployment as updateDeploymentInStorage,
  deleteDeployment as deleteDeploymentFromStorage
} from './deployment-storage';

export function useDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load deployments from localStorage on hook initialization
  useEffect(() => {
    const storedDeployments = getDeployments();
    setDeployments(storedDeployments);
    setLoading(false);
  }, []);

  // Add a new deployment
  const addDeployment = useCallback((deployment: Omit<Deployment, 'id' | 'createdAt'>) => {
    const newDeployment = addDeploymentToStorage(deployment);
    setDeployments(prev => [newDeployment, ...prev]);
    return newDeployment;
  }, []);

  // Update an existing deployment
  const updateDeployment = useCallback((id: string, updates: Partial<Deployment>) => {
    updateDeploymentInStorage(id, updates);
    setDeployments(prev => 
      prev.map(deployment => 
        deployment.id === id ? { ...deployment, ...updates } : deployment
      )
    );
  }, []);

  // Delete a deployment
  const deleteDeployment = useCallback((id: string) => {
    deleteDeploymentFromStorage(id);
    setDeployments(prev => prev.filter(deployment => deployment.id !== id));
  }, []);

  // Refresh deployments from localStorage
  const refreshDeployments = useCallback(() => {
    const storedDeployments = getDeployments();
    setDeployments(storedDeployments);
  }, []);

  return {
    deployments,
    loading,
    addDeployment,
    updateDeployment,
    deleteDeployment,
    refreshDeployments,
  };
}
