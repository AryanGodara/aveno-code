export interface Deployment {
  id: string;
  name: string;
  status: 'success' | 'pending' | 'failed';
  url?: string;
  createdAt: Date;
  repo: string;
  buildId?: string;
  publicHost?: string;
}

const DEPLOYMENTS_STORAGE_KEY = 'aveno_deployments';

/**
 * Get all deployments from localStorage
 */
export function getDeployments(): Deployment[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(DEPLOYMENTS_STORAGE_KEY);
    if (!stored) return [];
    
    const deployments = JSON.parse(stored);
    // Convert createdAt strings back to Date objects
    return deployments.map((deployment: any) => ({
      ...deployment,
      createdAt: new Date(deployment.createdAt)
    }));
  } catch (error) {
    console.error('Error loading deployments from localStorage:', error);
    return [];
  }
}

/**
 * Save deployments to localStorage
 */
export function saveDeployments(deployments: Deployment[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DEPLOYMENTS_STORAGE_KEY, JSON.stringify(deployments));
  } catch (error) {
    console.error('Error saving deployments to localStorage:', error);
  }
}

/**
 * Add a new deployment
 */
export function addDeployment(deployment: Omit<Deployment, 'id' | 'createdAt'>): Deployment {
  const newDeployment: Deployment = {
    ...deployment,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
  };
  
  const deployments = getDeployments();
  const updatedDeployments = [newDeployment, ...deployments];
  saveDeployments(updatedDeployments);
  
  return newDeployment;
}

/**
 * Update an existing deployment
 */
export function updateDeployment(id: string, updates: Partial<Deployment>): void {
  const deployments = getDeployments();
  const updatedDeployments = deployments.map(deployment =>
    deployment.id === id ? { ...deployment, ...updates } : deployment
  );
  saveDeployments(updatedDeployments);
}

/**
 * Delete a deployment
 */
export function deleteDeployment(id: string): void {
  const deployments = getDeployments();
  const updatedDeployments = deployments.filter(deployment => deployment.id !== id);
  saveDeployments(updatedDeployments);
}

/**
 * Clear all deployments
 */
export function clearDeployments(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEPLOYMENTS_STORAGE_KEY);
}
