/**
 * Branch Workspace Selector
 * UI component for selecting and managing development branches.
 * Appears in the shell when in development mode.
 */

import { useState } from 'react';
import { GitBranch } from '@/icons';
import { useDevBranchStore } from '@/store/devBranchStore';

export default function BranchWorkspace({ className }: { className?: string }) {
  const { branches, activeBranch, activeBranchId, createBranch, switchBranch } = useDevBranchStore();
  
  // Group branches by status
  const draftBranches = branches.filter(b => b.status === 'draft' || b.status === 'in-progress');
  const reviewBranches = branches.filter(b => b.status === 'review');
  
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  return (
    <div className={className}>
      {}
      {activeBranch ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-accent/10 text-accent text-pm-xs font-semibold">
            <GitBranch className="h-3.5 w-3.5" />
            {activeBranch.name}
          </span>
          <button
            type="button"
            onClick={() => switchBranch(null)}
            className="text-pm-xs text-content-muted hover:text-content-primary"
            title="Exit branch mode"
          >
            Exit
          </button>
        </div>
      ) : (
        <div className="relative">
          <select
            value={activeBranchId || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__create__') {
                setShowCreate(true);
              } else if (val) {
                switchBranch(val);
              }
            }}
            className="appearance-none bg-surface-secondary border border-line rounded-xl px-3 py-1.5 text-pm-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Branch...</option>
            {draftBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            {reviewBranches.length > 0 && (
              <optgroup label="In Review">
                {reviewBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </optgroup>
            )}
            <option value="__create__">+ New branch</option>
          </select>
          <GitBranch className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted pointer-events-none" />
        </div>
      )}
      
      {}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-surface-primary border border-line rounded-xl p-5 w-full max-w-md shadow-[var(--elevation-4)]">
            <h3 className="text-pm-md font-semibold text-content-primary mb-4">New Development Branch</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-pm-xs font-medium text-content-primary mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Feature: expense sorting"
                  className="w-full px-3 py-2 rounded-lg border border-line bg-surface-secondary text-pm-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              
              <div>
                <label className="block text-pm-xs font-medium text-content-primary mb-1">Description / PRD</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What does this branch implement?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-line bg-surface-secondary text-pm-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-1.5 rounded-lg text-pm-sm font-medium text-content-muted hover:text-content-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newName.trim()) {
                    createBranch(newName.trim(), newDesc);
                    setShowCreate(false);
                    setNewName('');
                    setNewDesc('');
                  }
                }}
                disabled={!newName.trim()}
                className="px-4 py-1.5 rounded-lg bg-accent text-pm-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}