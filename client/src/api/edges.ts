import { EdgeType, EdgeWithEdgeId } from '@/lib/types';
import { getSessionDetails, updateNodeRelations } from '@/lib/utils';
import { actions } from '@/pages/state';
import toast from 'react-hot-toast';
import { type Edge, type Node } from 'reactflow';

export const fetchEdges = async (): Promise<Edge[] | null> => {
  const session = getSessionDetails();

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/edges/${session?.user.username}/all`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.token}`,
      },
    }
  );

  if (response.status === 401) {
    actions.logout('UNAHTORIZED');
    return null;
  }

  if (!response.ok) {
    const status = response.status;
    toast.error(`Error fetching edges - Status: ${status}`);
    return null;
  }

  const edges = await response.json();

  return edges;
};

export const createEdge = async (
  edge: Edge,
  edges: Edge[],
  setEdges: (edges: Edge[]) => void
): Promise<Edge | null> => {
  const loadingToastId = toast.loading('Creating edge...');
  const session = getSessionDetails();
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/edges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.token}`,
      },
      body: JSON.stringify(edge),
    });

    if (response.status === 401) {
      actions.logout('UNAHTORIZED');
      return null;
    }

    if (!response.ok) {
      const status = response.status;
      toast.error(`Error creating edge - Status: ${status}`);
      return null;
    }

    const createdEdge = await response.json();

    toast.success('Edge created successfully!');

    if (createdEdge) {
      createdEdge.id = createdEdge.id.toString();
      const newEdges = edges.concat(createdEdge as Edge);
      setEdges(newEdges);
    }

    return createdEdge as Edge;
  } catch (error) {
    toast.error(`Error creating edge: ${(error as Error).message}`);
    throw error;
  } finally {
    loadingToastId && toast.dismiss(loadingToastId);
  }
};

export const deleteEdge = async (
  edgeIdToDelete: string,
  edges: Edge[],
  setEdges: (edges: Edge[]) => void,
  nodes: Node[],
  setNodes: (nodes: Node[]) => void,
  nodeToDeleteId?: string
): Promise<string | null> => {
  const edgeToDelete = edges.find(
    edge => edge.id === edgeIdToDelete
  ) as EdgeWithEdgeId;

  if (!edgeToDelete.edgeId) {
    toast.error(`Error deleting edge - ${edgeIdToDelete} not found`);
    return null;
  }

  const loadingToastId = toast.loading('Deleting edge...');
  const session = getSessionDetails();
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/edges/${edgeToDelete.edgeId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      }
    );

    if (response.status === 401) {
      actions.logout('UNAHTORIZED');
      return null;
    }

    if (!response.ok) {
      const status = response.status;
      toast.error(`Error deleting edge - Status: ${status}`);
      return null;
    }

    toast.success('Edge deleted successfully!');

    const edges = await fetchEdges();

    if (edges) {
      setEdges(edges);
    }

    return edgeIdToDelete;
  } catch (error) {
    toast.error(`Error deleting edge: ${(error as Error).message}`);
    throw error;
  } finally {
    loadingToastId && toast.dismiss(loadingToastId);
    updateNodeRelations(edgeToDelete, nodes, setNodes, nodeToDeleteId);
  }
};

export const updateEdge = async (
  edgeToUpdateId: string,
  edges: Edge[],
  setEdges: (edges: Edge[]) => void,
  newConnection: EdgeType
): Promise<Edge | null> => {
  const edgeToUpdate = edges.find(edge => edge.id === edgeToUpdateId);

  if (!edgeToUpdate) {
    toast.error(`Error updating edge - ${edgeToUpdateId} not found`);
    return null;
  }

  const loadingToastId = toast.loading('Updating edge...');

  edgeToUpdate.type = newConnection;

  const session = getSessionDetails();
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/edges`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.token}`,
      },
      body: JSON.stringify(edgeToUpdate),
    });

    if (response.status === 401) {
      actions.logout('UNAHTORIZED');
      return null;
    }

    if (!response.ok) {
      const status = response.status;
      toast.error(`Error updating edge - Status: ${status}`);
      return null;
    }

    toast.success('Edge updated successfully!');

    const updatedEdge = await response.json();

    if (updatedEdge) {
      const newEdges = edges.map(edge => {
        if (edge.id === updatedEdge.id) {
          return updatedEdge;
        }
        return edge;
      });

      setEdges(newEdges);
    }

    return updatedEdge as Edge;
  } catch (error) {
    toast.error(`Error updating edge: ${(error as Error).message}`);
    throw error;
  } finally {
    loadingToastId && toast.dismiss(loadingToastId);
  }
};
