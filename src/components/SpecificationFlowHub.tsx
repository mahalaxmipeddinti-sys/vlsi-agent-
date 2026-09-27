import React from 'react';

interface SpecificationFlowHubProps {
  [key: string]: any;
}

export function SpecificationFlowHub(props: SpecificationFlowHubProps) {
  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg border border-gray-700">
      <h3 className="text-lg font-bold">Specification Flow Hub</h3>
      <p className="text-sm text-gray-400 mt-2">Loading specification details...</p>
    </div>
  );
}
