'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Save, Building2, Palette, Zap, Bell, Tag, Plus, Trash2, GripVertical, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyNamingConvention, DEFAULT_NAMING_CONVENTION } from '@/lib/utils';
import type { NamingConvention, NamingVariable } from '@/lib/types';

function NamingConventionBuilder() {
  const convention = useAppStore((s) => s.namingConvention);
  const updateNamingConvention = useAppStore((s) => s.updateNamingConvention);
  const currentAccount = useAppStore((s) => s.currentAccount)();

  const [formula, setFormula] = useState(convention.formula);
  const [separator, setSeparator] = useState(convention.separator);
  const [variables, setVariables] = useState<NamingVariable[]>(convention.variables);
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const sampleItem = {
    adFormat: 'ugc' as const, adSize: '9:16', angle: 'Pain Point',
    concept: 'Skincare routine', product: 'Serum Pro',
  };

  const previewConvention: NamingConvention = { formula, separator, variables };
  const preview = applyNamingConvention(previewConvention, sampleItem, {
    brand: currentAccount?.name?.slice(0, 3) || 'BRD',
    index: 1,
  });

  const handleSave = () => {
    updateNamingConvention({ formula, separator, variables });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setFormula(DEFAULT_NAMING_CONVENTION.formula);
    setSeparator(DEFAULT_NAMING_CONVENTION.separator);
    setVariables(DEFAULT_NAMING_CONVENTION.variables);
  };

  const updateVariable = (key: string, updates: Partial<NamingVariable>) => {
    setVariables((vars) => vars.map((v) => v.key === key ? { ...v, ...updates } : v));
  };

  const addMapping = (varKey: string) => {
    setVariables((vars) => vars.map((v) =>
      v.key === varKey ? { ...v, values: [...(v.values || []), { match: '', output: '' }] } : v
    ));
  };

  const updateMapping = (varKey: string, idx: number, field: 'match' | 'output', val: string) => {
    setVariables((vars) => vars.map((v) =>
      v.key === varKey ? {
        ...v,
        values: (v.values || []).map((m, i) => i === idx ? { ...m, [field]: val } : m),
      } : v
    ));
  };

  const removeMapping = (varKey: string, idx: number) => {
    setVariables((vars) => vars.map((v) =>
      v.key === varKey ? { ...v, values: (v.values || []).filter((_, i) => i !== idx) } : v
    ));
  };

  const addVariable = () => {
    const existing = variables.map((v) => v.key);
    const nextKey = 'abcdefghijklmnopqrstuvwxyz'.split('').find((k) => !existing.includes(k) && k !== '#') || 'x';
    const newVar = {
      key: nextKey, label: '', source: 'custom' as const, fallback: '', maxLength: 8,
      values: [{ match: '', output: '' }],
    };
    setVariables([...variables, newVar]);
    setEditingVar(nextKey);
  };

  const removeVariable = (key: string) => {
    setVariables((vars) => vars.filter((v) => v.key !== key));
    setFormula((f) => f.replace(`{${key}}`, '').replace(`{sep}{sep}`, '{sep}'));
  };

  const insertVariable = (key: string) => {
    const tag = `{${key}}`;
    if (!formula.includes(tag)) {
      setFormula((f) => f ? `${f}{sep}${tag}` : tag);
    }
  };

  const FIELD_OPTIONS: { value: string; label: string }[] = [
    { value: 'adFormat', label: 'Ad Format' },
    { value: 'adSize', label: 'Ad Size' },
    { value: 'angle', label: 'Angle' },
    { value: 'concept', label: 'Concept' },
    { value: 'product', label: 'Product' },
    { value: 'adLength', label: 'Ad Length' },
  ];

  return (
    <div className="space-y-5">
      {/* Live Preview */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" /> Live Preview
          </h3>
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Sample data</span>
        </div>
        <div className="bg-background border border-border rounded-lg px-4 py-3">
          <p className="font-mono text-sm font-semibold tracking-wide">{preview || '—'}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
          <span>Format: <span className="text-foreground">UGC</span></span>
          <span>Size: <span className="text-foreground">9:16</span></span>
          <span>Angle: <span className="text-foreground">Pain Point</span></span>
          <span>Concept: <span className="text-foreground">Skincare routine</span></span>
          <span>Product: <span className="text-foreground">Serum Pro</span></span>
        </div>
      </div>

      {/* Formula Builder */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-1">Formula</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Build your naming pattern using variables. Click a variable chip to insert it.
        </p>

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs font-medium block mb-1.5">Pattern</label>
            <input value={formula} onChange={(e) => setFormula(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              placeholder="{b}{sep}{f}{sep}{s}{sep}{a}{sep}{#}"
            />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium block mb-1.5">Separator</label>
            <select value={separator} onChange={(e) => setSeparator(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono">
              <option value="_">_ (underscore)</option>
              <option value="-">- (dash)</option>
              <option value=".">. (dot)</option>
              <option value=" ">  (space)</option>
            </select>
          </div>
        </div>

        {/* Variable chips */}
        <div className="flex flex-wrap gap-1.5">
          {variables.map((v) => {
            const isInFormula = formula.includes(`{${v.key}}`);
            return (
              <button key={v.key} type="button" onClick={() => insertVariable(v.key)}
                className={cn(
                  'text-xs font-mono px-2.5 py-1 rounded-full border transition-colors',
                  isInFormula
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                )}>
                {`{${v.key}}`} <span className="font-sans ml-1 opacity-70">{v.label}</span>
              </button>
            );
          })}
          <button type="button" onClick={addVariable}
            className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Variable Definitions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Variable Definitions</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Define how each variable resolves. Field variables pull from the brief, custom identifiers let you pick from a defined list.
        </p>

        <div className="space-y-3">
          {variables.filter((v) => v.source === 'field' || v.key === 'b' || v.key === '#').length > 0 && (
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Field Variables</p>
          )}
          {variables.filter((v) => v.source === 'field' || v.key === 'b' || v.key === '#').map((v) => {
            const isExpanded = editingVar === v.key;
            return (
              <div key={v.key} className="border border-border rounded-lg overflow-hidden">
                {/* Variable header */}
                <button type="button" onClick={() => setEditingVar(isExpanded ? null : v.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded">
                    {`{${v.key}}`}
                  </span>
                  <span className="text-sm font-medium flex-1">{v.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {v.source === 'field' ? `→ ${v.field}` : 'custom'}
                  </span>
                  {(v.values?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                      {v.values?.length} mapping{(v.values?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/10">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium block mb-1">Label</label>
                        <input value={v.label} onChange={(e) => updateVariable(v.key, { label: e.target.value })}
                          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">Source</label>
                        <select value={v.source} onChange={(e) => updateVariable(v.key, { source: e.target.value as 'field' | 'custom' })}
                          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="field">Brief Field</option>
                          <option value="custom">Custom Value</option>
                        </select>
                      </div>
                      {v.source === 'field' ? (
                        <div>
                          <label className="text-xs font-medium block mb-1">Field</label>
                          <select value={v.field || ''} onChange={(e) => updateVariable(v.key, { field: e.target.value as keyof typeof sampleItem })}
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="">Select...</option>
                            {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium block mb-1">Fallback</label>
                          <input value={v.fallback} onChange={(e) => updateVariable(v.key, { fallback: e.target.value })}
                            placeholder="Default value"
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium block mb-1">Max Length</label>
                        <input type="number" value={v.maxLength || ''} onChange={(e) => updateVariable(v.key, { maxLength: parseInt(e.target.value) || undefined })}
                          placeholder="No limit"
                          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {v.source === 'field' && (
                        <div>
                          <label className="text-xs font-medium block mb-1">Fallback</label>
                          <input value={v.fallback} onChange={(e) => updateVariable(v.key, { fallback: e.target.value })}
                            placeholder="If no match"
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Value mappings */}
                    {v.key !== '#' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium">Value Mappings</label>
                          <button type="button" onClick={() => addMapping(v.key)}
                            className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add mapping
                          </button>
                        </div>
                        {(v.values?.length ?? 0) > 0 && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-[11px] text-muted-foreground font-medium px-1">
                              <span>When value is</span><span></span><span>Output</span><span></span>
                            </div>
                            {v.values?.map((m, idx) => (
                              <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                                <input value={m.match} onChange={(e) => updateMapping(v.key, idx, 'match', e.target.value)}
                                  placeholder="e.g. video"
                                  className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <span className="text-xs text-muted-foreground">→</span>
                                <input value={m.output} onChange={(e) => updateMapping(v.key, idx, 'output', e.target.value)}
                                  placeholder="e.g. VID"
                                  className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                />
                                <button type="button" onClick={() => removeMapping(v.key, idx)}
                                  className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {(v.values?.length ?? 0) === 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            No mappings — raw field value will be uppercased and truncated.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Remove variable */}
                    {!['b', 'f', 's', 'a', '#'].includes(v.key) && (
                      <button type="button" onClick={() => removeVariable(v.key)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 pt-1">
                        <Trash2 className="w-3 h-3" /> Remove variable
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom Identifiers */}
          <div className="pt-3 mt-3 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Identifiers</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Define your own variables with selectable options — shown as dropdowns in the brief drawer.</p>
              </div>
              <button type="button" onClick={addVariable}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/20 rounded-lg px-3 py-1.5 hover:bg-primary/5">
                <Plus className="w-3 h-3" /> New Identifier
              </button>
            </div>
            {variables.filter((v) => v.source === 'custom' && v.key !== 'b' && v.key !== '#').length === 0 ? (
              <div className="border border-dashed border-border rounded-lg py-6 text-center">
                <Tag className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">No custom identifiers yet</p>
                <p className="text-[11px] text-muted-foreground">Add one to create variables like <span className="font-mono">{'{{t}}'} Creative Type</span> or <span className="font-mono">{'{{g}}'} Geo</span></p>
              </div>
            ) : (
              <div className="space-y-3">
                {variables.filter((v) => v.source === 'custom' && v.key !== 'b' && v.key !== '#').map((v) => {
                  const isExpanded = editingVar === v.key;
                  return (
                    <div key={v.key} className="border border-border rounded-lg overflow-hidden">
                      <button type="button" onClick={() => setEditingVar(isExpanded ? null : v.key)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded">
                          {`{${v.key}}`}
                        </span>
                        <span className="text-sm font-medium flex-1">{v.label || 'Untitled'}</span>
                        {(v.values?.length ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                            {v.values?.length} option{(v.values?.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/10">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium block mb-1">Label</label>
                              <input value={v.label} onChange={(e) => updateVariable(v.key, { label: e.target.value })}
                                placeholder="e.g. Creative Type"
                                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-1">Fallback</label>
                              <input value={v.fallback} onChange={(e) => updateVariable(v.key, { fallback: e.target.value })}
                                placeholder="If none selected"
                                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-1">Max Length</label>
                              <input type="number" value={v.maxLength || ''} onChange={(e) => updateVariable(v.key, { maxLength: parseInt(e.target.value) || undefined })}
                                placeholder="No limit"
                                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium">Options</label>
                              <button type="button" onClick={() => addMapping(v.key)}
                                className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add option
                              </button>
                            </div>
                            {(v.values?.length ?? 0) > 0 ? (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-[11px] text-muted-foreground font-medium px-1">
                                  <span>Display name</span><span></span><span>Short code</span><span></span>
                                </div>
                                {v.values?.map((m, idx) => (
                                  <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                                    <input value={m.match} onChange={(e) => updateMapping(v.key, idx, 'match', e.target.value)}
                                      placeholder="e.g. Before & After"
                                      className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <span className="text-xs text-muted-foreground">→</span>
                                    <input value={m.output} onChange={(e) => updateMapping(v.key, idx, 'output', e.target.value)}
                                      placeholder="e.g. BA"
                                      className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                    />
                                    <button type="button" onClick={() => removeMapping(v.key, idx)}
                                      className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Add options that will appear as a dropdown in the brief drawer.</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button type="button" onClick={() => removeVariable(v.key)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Remove identifier
                            </button>
                            <button type="button" onClick={() => insertVariable(v.key)}
                              className="text-xs text-primary hover:underline">
                              {formula.includes(`{${v.key}}`) ? 'Already in formula' : '+ Add to formula'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={handleReset}
          className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">
          Reset to Default
        </button>
        <button type="button" onClick={handleSave}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Convention'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<'workspace' | 'naming' | 'integrations' | 'notifications'>('workspace');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS = [
    { id: 'workspace', label: 'Workspace', icon: Building2 },
    { id: 'naming', label: 'Naming', icon: Tag },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace and integrations.</p>
      </div>

      <div className="flex gap-6">
        {/* Side nav */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  tab === id ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'workspace' && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Workspace</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Workspace Name</label>
                    <input defaultValue={user?.team || 'GrowthSprint'}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Default Brand Short Code</label>
                    <input defaultValue="GS"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Used as the prefix in auto-generated ad names (e.g. GS_UGC_9x16_…)</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Palette className="w-4 h-4" /> Profile</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Name</label>
                      <input defaultValue={user?.name}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Email</label>
                      <input defaultValue={user?.email} disabled
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleSave}
                className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" />
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'naming' && <NamingConventionBuilder />}

          {tab === 'integrations' && (
            <div className="space-y-3">
              {[
                { name: 'Meta Ads Manager', desc: 'Push creative directly to campaigns and ad sets', connected: false, icon: '⚡' },
                { name: 'Frame.io', desc: 'Sync review and approval status automatically', connected: false, icon: '🎬' },
                { name: 'Slack', desc: 'Get notified when status changes in your pipeline', connected: false, icon: '💬' },
                { name: 'Motion', desc: 'Pull performance data into your creative workflow', connected: false, icon: '📊' },
              ].map(({ name, desc, connected, icon }) => (
                <div key={name} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg">{icon}</div>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <button className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    connected
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-border hover:bg-secondary text-foreground'
                  }`}>
                    {connected ? 'Connected' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold">Notification Preferences</h3>
              {[
                { label: 'Status changes', desc: 'When a creative moves to a new status' },
                { label: 'Ready to Launch', desc: 'When creative is marked ready for launch' },
                { label: 'Launched', desc: 'When a creative is pushed to Meta' },
                { label: 'Revisions needed', desc: 'When creative is sent back for revisions' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
