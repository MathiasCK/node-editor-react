import toast from 'react-hot-toast';
import { type Connection, type Edge, type Node, Position } from 'reactflow';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  AspectType,
  CustomNodeProps,
  EdgeType,
  NodeRelation,
  NodeType,
  RelationKeys,
  RelationKeysWithChildren,
  RelationType,
} from './types';
import { createNode, updateNode } from '@/api/nodes';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const checkConnection = (
  params: Edge | Connection,
  edgeType: EdgeType,
  nodes: Node[]
): {
  canConnect: boolean;
  connectionType?: EdgeType;
  lockConnection?: boolean;
  newNodeRelations?: NodeRelation[];
} => {
  const newNodeRelations: NodeRelation[] = [];

  let connectionType = edgeType;
  let lockConnection = false;

  if (params.source === params.target) {
    toast.error('Cannot connect node to itself');
    return {
      canConnect: false,
    };
  }

  // Set terminalOf property for terminal & terminals array for block
  if (
    isTerminal(params.targetHandle as string) &&
    isBlock(params.sourceHandle as string)
  ) {
    const terminal = nodes.find(t => t.id === params.target);

    if (terminal?.data?.parent !== 'void') {
      toast.error(`Terminal ${params.target} already has a parent`);
      return {
        canConnect: false,
      };
    }

    lockConnection = true;
    connectionType = EdgeType.Connected;

    newNodeRelations.push({
      nodeId: params.target as string,
      relation: {
        terminalOf: params.source as string,
        parent: params.source as string,
      },
    });

    newNodeRelations.push({
      nodeId: params.source as string,
      relations: {
        terminals: {
          id: params.target as string,
        },
        children: {
          id: params.target as string,
        },
      },
    });
  }

  // Set terminalOf property for terminal & terminals array for block
  if (
    isBlock(params.targetHandle as string) &&
    isTerminal(params.sourceHandle as string)
  ) {
    const terminal = nodes.find(t => t.id === params.source);

    if (terminal?.data?.parent !== 'void') {
      toast.error(`Terminal ${params.source} already has a parent`);
      return {
        canConnect: false,
      };
    }

    lockConnection = true;
    connectionType = EdgeType.Connected;

    newNodeRelations.push({
      nodeId: params.source as string,
      relation: {
        parent: params.target as string,
        terminalOf: params.target as string,
      },
    });

    newNodeRelations.push({
      nodeId: params.target as string,
      relations: {
        terminals: {
          id: params.source as string,
        },
        children: {
          id: params.source as string,
        },
      },
    });
  }

  if (connectionType === EdgeType.Part && !lockConnection) {
    const sourceNode = nodes.find(node => node.id === params.source);

    if (
      sourceNode?.data?.directPartOf &&
      sourceNode?.data?.directPartOf !== ''
    ) {
      const partOfNode = nodes.find(
        node => node.id === sourceNode?.data?.directPartOf
      );

      toast.error(
        `${sourceNode.data.customName ?? sourceNode.id} is already part of ${partOfNode?.data?.customName ?? sourceNode?.data?.directPartOf}`
      );
      return {
        canConnect: false,
      };
    }

    newNodeRelations.push({
      nodeId: params.target as string,
      relations: {
        directParts: {
          id: params.source as string,
        },
        children: {
          id: params.source as string,
        },
      },
    });

    newNodeRelations.push({
      nodeId: params.source as string,
      relation: {
        parent: params.target as string,
        directPartOf: params.target as string,
      },
    });
  }

  // Set transfersTo property for terminal
  if (
    isTerminal(params.sourceHandle as string) &&
    isTerminal(params.targetHandle as string)
  ) {
    // Check if terminal is already connected to other terminals
    const targetTerminal = nodes.find(node => node.id === params.target);

    if (targetTerminal?.data?.parent !== 'void') {
      toast.error(`Terminal ${params.target} already has a parent`);
      return {
        canConnect: false,
      };
    }

    lockConnection = true;
    connectionType = EdgeType.Transfer;

    newNodeRelations.push({
      nodeId: params.source as string,
      relations: {
        transfersTo: {
          id: params.target as string,
        },
        children: {
          id: params.target as string,
        },
      },
    });

    newNodeRelations.push({
      nodeId: params.target as string,
      relation: {
        transferedBy: params.source as string,
        parent: params.source as string,
      },
    });
  }

  if (connectionType === EdgeType.Fulfilled && !lockConnection) {
    newNodeRelations.push({
      nodeId: params.source as string,
      relations: {
        fulfills: {
          id: params.target as string,
        },
        children: {
          id: params.target as string,
        },
      },
    });

    newNodeRelations.push({
      nodeId: params.target as string,
      relation: {
        parent: params.source as string,
        fulfilledBy: params.source as string,
      },
    });
  }

  if (connectionType === EdgeType.Connected && !lockConnection) {
    newNodeRelations.push({
      nodeId: params.source as string,
      relations: {
        connectedTo: {
          id: params.target as string,
        },
        children: {
          id: params.target as string,
        },
      },
    });

    newNodeRelations.push({
      nodeId: params.target as string,
      relation: {
        parent: params.source as string,
        connectedBy: params.source as string,
      },
    });
  }

  return { canConnect: true, connectionType, lockConnection, newNodeRelations };
};

export const handleNewNodeRelations = (
  newNodeRelations: NodeRelation[],
  nodes: Node[],
  setNodes: (nodes: Node[]) => void
) => {
  for (const relation of newNodeRelations) {
    const nodeToUpdate = nodes.find(node => node.id === relation.nodeId);
    const index = nodes.findIndex(node => node.id === relation.nodeId);

    if (!nodeToUpdate || index === -1) return;

    if (relation.relation) {
      Object.keys(relation.relation).forEach(keyToUpdate => {
        nodeToUpdate.data[keyToUpdate] = relation.relation![keyToUpdate];
      });
    }

    if (relation.relations) {
      Object.keys(relation.relations).forEach(r => {
        nodeToUpdate.data[r] = [
          ...(nodeToUpdate.data[r] ?? []),
          relation.relations![r],
        ];
      });
    }

    updateNode(nodeToUpdate.id, nodes, setNodes);
  }
};

export const isBlock = (id: string): boolean => id.includes('block');

export const isConnector = (id: string): boolean => id.includes('connector');

export const isTerminal = (id: string): boolean => id.includes('terminal');

export const isTextBox = (id: string): boolean => id.includes('textbox');

export const getSymmetricDifference = (arr1: Edge[], arr2: Edge[]): Edge[] => {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  const difference = new Set(
    [...set1]
      .filter(x => !set2.has(x))
      .concat([...set2].filter(x => !set1.has(x)))
  );

  return Array.from(difference);
};

export const capitalizeFirstLetter = (string: string) =>
  string.charAt(0).toUpperCase() + string.slice(1);

export const addNode = async (
  aspect: AspectType,
  type: NodeType,
  nodes: Node[],
  setNodes: (nodes: Node[]) => void
) => {
  const id =
    nodes.length === 0
      ? '0'
      : nodes
          .reduce((max, obj) => Math.max(max, Number(obj.id) + 1), 0)
          .toString();

  const currentDate = Date.now();
  const newNode: Node = {
    type,
    id,
    position: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    },
    data: {
      aspect,
      label: `${type}_${id}`,
      type,
      createdAt: currentDate,
      updatedAt: currentDate,
    },
  };

  await createNode(newNode as Node, nodes, setNodes);
};

export const updateNodeRelations = async (
  currentEdge: Edge,
  nodes: Node[],
  setNodes: (nodes: Node[]) => void,
  nodeIdToDelete?: string
) => {
  if (
    isTerminal(currentEdge.sourceHandle!) &&
    isTerminal(currentEdge.targetHandle!)
  ) {
    // Deleting a terminal -> terminal connection where "transfersTo" should be updated
    const sourceTerminal = nodes.find(
      terminal => terminal.id === currentEdge.source
    );

    const targetTerminal = nodes.find(
      terminal => terminal.id === currentEdge.target
    );

    if (!sourceTerminal || !targetTerminal) return;

    if (targetTerminal.id !== nodeIdToDelete) {
      targetTerminal.data.transferedBy = null;
      targetTerminal.data.parent = 'void';
      await updateNode(targetTerminal.id, nodes, setNodes);
    }

    if (sourceTerminal.id !== nodeIdToDelete) {
      const filteredChildren = sourceTerminal.data.children.filter(
        (child: { id: string }) => child.id !== targetTerminal.id
      );
      sourceTerminal.data.children = filteredChildren.length
        ? filteredChildren
        : null;
      sourceTerminal.data.transfersTo = null;
      await updateNode(sourceTerminal.id, nodes, setNodes);
    }

    return;
  }

  // Deleting a terminal -> block connection
  if (
    isTerminal(currentEdge.sourceHandle!) &&
    isBlock(currentEdge.targetHandle!)
  ) {
    const terminal = nodes.find(node => node.id === currentEdge.source);
    const block = nodes.find(node => node.id === currentEdge.target);

    if (!terminal || !block) return;

    if (terminal.id !== nodeIdToDelete) {
      terminal.data.terminalOf = null;
      terminal.data.parent = 'void';

      await updateNode(terminal.id, nodes, setNodes);
    }

    if (block.id !== nodeIdToDelete) {
      const filteredTerminals = block.data.terminals.filter(
        (id: string) => id !== terminal.id
      );
      const filteredChildren = block.data.children.filter(
        (child: { id: string }) => child.id !== terminal.id
      );
      block.data.terminals = filteredTerminals.length
        ? filteredTerminals
        : null;
      block.data.children = filteredChildren.length ? filteredChildren : null;
    }

    await updateNode(block.id, nodes, setNodes);
  }

  // Deleting a block -> terminal connection
  if (
    isTerminal(currentEdge.targetHandle!) &&
    isBlock(currentEdge.sourceHandle!)
  ) {
    const terminal = nodes.find(node => node.id === currentEdge.source);
    const block = nodes.find(node => node.id === currentEdge.target);

    if (!terminal || !block) return;

    if (terminal.id !== nodeIdToDelete) {
      terminal.data.terminalOf = null;
      terminal.data.parent = 'void';

      await updateNode(terminal.id, nodes, setNodes);
    }

    if (block.id !== nodeIdToDelete) {
      const filteredTerminals = block.data.terminals.filter(
        (id: string) => id !== terminal.id
      );
      const filteredChildren = block.data.children.filter(
        (child: { id: string }) => child.id !== terminal.id
      );
      block.data.terminals = filteredTerminals.length
        ? filteredTerminals
        : null;
      block.data.children = filteredChildren.length ? filteredChildren : null;
    }

    await updateNode(block.id, nodes, setNodes);
  }

  if (
    currentEdge.type === EdgeType.Connected &&
    !currentEdge.data.lockCoonection
  ) {
    const sourceNode = nodes.find(node => node.id === currentEdge.source);
    const targetNode = nodes.find(node => node.id === currentEdge.target);

    if (!sourceNode || !targetNode) return;

    if (sourceNode.id !== nodeIdToDelete) {
      const updatedConnectedTo = sourceNode.data.connectedTo.filter(
        (node: { id: string }) => node.id !== currentEdge.target
      );

      sourceNode.data.connectedTo = updatedConnectedTo.length
        ? updatedConnectedTo
        : null;

      const updatedChildren = sourceNode.data.children.filter(
        (child: { id: string }) => child.id !== currentEdge.target
      );

      sourceNode.data.children = updatedChildren.length
        ? updatedChildren
        : null;

      await updateNode(sourceNode.id, nodes, setNodes);
    }

    if (targetNode.id !== nodeIdToDelete) {
      targetNode.data.connectedBy = null;
      targetNode.data.parent = 'void';

      await updateNode(targetNode.id, nodes, setNodes);
    }
    return;
  }

  if (currentEdge.type === EdgeType.Part) {
    const sourceNode = nodes.find(node => node.id === currentEdge.source);
    const targetNode = nodes.find(node => node.id === currentEdge.target);

    if (!sourceNode || !targetNode) return;

    if (targetNode.id !== nodeIdToDelete) {
      const filteredDirectParts = targetNode.data.directParts.filter(
        (part: { id: string }) => part.id !== currentEdge.source
      );

      targetNode.data.directParts =
        filteredDirectParts.length > 0 ? filteredDirectParts : null;

      const filteredChildren = targetNode.data.children.filter(
        (child: { id: string }) => child.id !== currentEdge.source
      );

      targetNode.data.children = filteredChildren.length
        ? filteredChildren
        : null;

      await updateNode(targetNode.id, nodes, setNodes);
    }

    if (sourceNode.id !== nodeIdToDelete) {
      sourceNode.data.directPartOf = null;
      sourceNode.data.parent = 'void';
      await updateNode(sourceNode.id, nodes, setNodes);
    }

    return;
  }

  if (currentEdge.type === EdgeType.Fulfilled) {
    const sourceNode = nodes.find(node => node.id === currentEdge.source);
    const targetNode = nodes.find(node => node.id === currentEdge.target);

    if (!sourceNode || !targetNode) return;

    if (sourceNode.id !== nodeIdToDelete) {
      const filteredFulfills = sourceNode.data.fulfills.filter(
        (node: { id: string }) => node.id !== currentEdge.target
      );

      sourceNode.data.fulfills =
        filteredFulfills.length === 0 ? null : filteredFulfills;

      const filteredChildren = sourceNode.data.children.filter(
        (child: { id: string }) => child.id !== currentEdge.target
      );

      sourceNode.data.children = filteredChildren.length
        ? filteredChildren
        : null;

      await updateNode(sourceNode.id, nodes, setNodes);
    }

    if (targetNode.id !== nodeIdToDelete) {
      targetNode.data.fulfilledBy = null;
      targetNode.data.parent = 'void';
      await updateNode(targetNode.id, nodes, setNodes);
    }

    return;
  }
};

export const getNodeRelations = (
  currentNode: CustomNodeProps
): RelationKeysWithChildren[] => {
  const transformableKeys: RelationKeys[] = [
    'connectedTo',
    'connectedBy',
    'directParts',
    'fulfilledBy',
    'terminals',
    'terminalOf',
    'directPartOf',
    'transfersTo',
    'transferedBy',
    'fulfills',
  ];

  return transformableKeys.reduce(
    (acc: RelationKeysWithChildren[], key: RelationKeys) => {
      if (currentNode.data[key]) {
        let children: { id: string }[];

        if (typeof currentNode.data[key] === 'string') {
          children = [{ id: currentNode.data[key] as string }];
        } else {
          children = currentNode.data[key] as { id: string }[];
        }

        acc.push({
          key,
          children,
        });
      }
      return acc;
    },
    []
  );
};

export const displayNewNode = (
  newNodeId: string,
  nodes: Node[],
  openSidebar: (data: CustomNodeProps) => void,
  closeSidebar: () => void
) => {
  const node = nodes.find(n => n.id === newNodeId);

  if (!node) {
    toast.error(
      `Could not display node ${newNodeId}. Refresh page & try again`
    );
    return;
  }
  closeSidebar();
  setTimeout(() => {
    openSidebar({
      data: node.data,
      dragging: node.dragging as boolean,
      id: node.id,
      isConnectable: true,
      selected: true,
      type: node.type as string,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      xPos: node.position.x,
      yPos: node.position.y,
      zIndex: 0,
    } as CustomNodeProps);
  }, 100);
};

export const updateNodeConnectionData = async (
  sourceNodeId: string,
  targetNodeId: string,
  nodes: Node[],
  setNodes: (nodes: Node[]) => void,
  oldConnection: EdgeType,
  newConnection: EdgeType
): Promise<boolean> => {
  if (
    oldConnection === EdgeType.Transfer ||
    newConnection === EdgeType.Transfer
  ) {
    toast.error('Transfer connection cannot be updated. Delete & create new.');
    return false;
  }

  const targetNode = nodes.find(node => node.id === targetNodeId);
  const sourceNode = nodes.find(node => node.id === sourceNodeId);

  if (!sourceNode || !targetNode) {
    toast.error(
      'Could not find nodes to update connection data. Refresh page & try again.'
    );
    return false;
  }

  if (oldConnection === EdgeType.Part) {
    const filteredDirectPartOf = targetNode.data.directPartOf.filter(
      (part: { id: string }) => part.id !== sourceNode.id
    );

    targetNode.data.directPartOf =
      filteredDirectPartOf.length > 0 ? filteredDirectPartOf : null;

    const filteredDirectParts = sourceNode.data.directParts.filter(
      (part: { id: string }) => part.id !== targetNode.id
    );

    sourceNode.data.directParts =
      filteredDirectParts.length > 0 ? filteredDirectParts : null;
  } else if (oldConnection === EdgeType.Fulfilled) {
    const filteredFulfills = targetNode.data.fulfills?.filter(
      (node: CustomNodeProps) => node.id !== sourceNodeId
    );
    targetNode.data.fulfills =
      filteredFulfills?.length > 0 ? filteredFulfills : null;

    const filteredFulfilledBy = sourceNode.data.fulfilledBy?.filter(
      (node: CustomNodeProps) => node.id !== targetNodeId
    );

    sourceNode.data.fulfilledBy =
      filteredFulfilledBy?.length > 0 ? filteredFulfilledBy : null;
  } else {
    const filteredConnectedTo = sourceNode.data.connectedTo?.filter(
      (node: CustomNodeProps) => node.id !== targetNodeId
    );

    sourceNode.data.connectedTo =
      filteredConnectedTo?.length > 0 ? filteredConnectedTo : null;

    const filteredConnectedBy = targetNode.data.connectedBy?.filter(
      (node: CustomNodeProps) => node.id !== sourceNodeId
    );

    targetNode.data.connectedBy =
      filteredConnectedBy?.length > 0 ? filteredConnectedBy : null;
  }

  if (newConnection === EdgeType.Fulfilled) {
    targetNode.data.fulfills = [
      ...(targetNode.data.fulfills ?? []),
      { id: sourceNodeId },
    ];

    sourceNode.data.fulfilledBy = [
      ...(sourceNode.data.fulfilledBy ?? []),
      { id: targetNodeId },
    ];
  } else if (newConnection === EdgeType.Part) {
    targetNode.data.directPartOf = [
      ...(targetNode.data.directPartOf ?? []),
      { id: sourceNodeId },
    ];

    sourceNode.data.directParts = [
      ...(sourceNode.data.directParts ?? []),
      { id: targetNodeId },
    ];
  } else {
    targetNode.data.connectedBy = [
      ...(targetNode.data.connectedBy ?? []),
      { id: sourceNodeId },
    ];
    sourceNode.data.connectedTo = [
      ...(sourceNode.data.connectedTo ?? []),
      { id: targetNodeId },
    ];
  }

  await updateNode(sourceNode.id, nodes, setNodes);
  await updateNode(targetNode.id, nodes, setNodes);

  return true;
};

export const getReadableRelation = (type: RelationType): string | null => {
  switch (type) {
    case RelationType.DirectParts:
      return 'Parts';
    case RelationType.ConnectedTo:
      return 'Connected to';
    case RelationType.ConnectedBy:
      return 'Connected by';
    case RelationType.FulfilledBy:
      return 'Fulfilled by';
    case RelationType.Terminals:
      return 'Terminals';
    case RelationType.TerminalOf:
      return 'Terminal of';
    case RelationType.DirectPartOf:
      return 'Part of';
    case RelationType.TransfersTo:
      return 'Transfers to';
    case RelationType.TransferedBy:
      return 'Transfered by';
    case RelationType.Fulfills:
      return 'Fulfills';
    default:
      return null;
  }
};
