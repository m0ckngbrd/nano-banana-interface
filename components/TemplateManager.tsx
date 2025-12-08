import React, { useState } from 'react';
import { PromptTemplate } from '../types';
import { Button } from './Button';
import { Bookmark, Trash2, Plus, Sparkles, X } from 'lucide-react';

interface TemplateManagerProps {
  templates: PromptTemplate[];
  onAdd: (template: PromptTemplate) => void;
  onRemove: (id: string) => void;
  onSelect: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onAdd,
  onRemove,
  onSelect,
  isOpen,
  onClose
}) => {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    
    onAdd({
      id: crypto.randomUUID(),
      name: newTemplateName,
      content: newTemplateContent
    });
    
    setNewTemplateName('');
    setNewTemplateContent('');
    setIsCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bookmark className="text-indigo-400" />
            Prompt Templates
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isCreating && (
            <Button 
              onClick={() => setIsCreating(true)} 
              variant="secondary"
              className="w-full mb-6 py-3 border-dashed border-2 border-slate-600 bg-transparent hover:border-indigo-500 hover:text-indigo-400"
              icon={<Plus size={20} />}
            >
              Create New Template
            </Button>
          )}

          {isCreating && (
            <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-indigo-500/50 animation-fade-in">
              <h3 className="text-sm font-semibold text-indigo-300 mb-3 uppercase tracking-wider">New Template</h3>
              <input
                type="text"
                placeholder="Template Name (e.g., 'Cyberpunk City')"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Prompt Content..."
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mb-4 h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Template</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.length === 0 && !isCreating && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Sparkles className="mx-auto mb-4 opacity-50" size={48} />
                <p>No templates saved yet.</p>
              </div>
            )}
            
            {templates.map(template => (
              <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-indigo-500/50 transition-colors group relative">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(template.id); }}
                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-900/80 rounded-full"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
                <h3 className="font-bold text-slate-200 mb-2 pr-8">{template.name}</h3>
                <p className="text-sm text-slate-400 line-clamp-3 mb-4 h-14">{template.content}</p>
                <Button 
                  className="w-full text-sm" 
                  variant="secondary"
                  onClick={() => {
                    onSelect(template.content);
                    onClose();
                  }}
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};