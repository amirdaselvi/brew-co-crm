import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Filter, 
  Save, 
  Users, 
  Loader2, 
  ListFilter,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Builders state
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'ai', 'manual'
  const [segmentName, setSegmentName] = useState('');
  const [segmentDesc, setSegmentDesc] = useState('');

  // AI Builder specific
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedResult, setSuggestedResult] = useState(null); // rules, name, description, customer_count, sample_customers

  // Manual Builder specific
  const [manualRules, setManualRules] = useState([
    { field: 'total_spent', operator: 'gt', value: '' }
  ]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [manualPreview, setManualPreview] = useState(null); // count, sample

  // Constants
  const fields = [
    { value: 'total_spent', label: 'Total Spent (₹)' },
    { value: 'order_count', label: 'Order Count' },
    { value: 'city', label: 'City' },
    { value: 'age_group', label: 'Age Group' },
    { value: 'last_order_date', label: 'Inactivity (Days)' },
    { value: 'tags', label: 'Tags' }
  ];

  const operators = {
    total_spent: [
      { value: 'gt', label: 'Greater than (>)' },
      { value: 'lt', label: 'Less than (<)' },
      { value: 'gte', label: 'Greater than or equal (>=)' },
      { value: 'lte', label: 'Less than or equal (<=)' },
      { value: 'eq', label: 'Equals (=)' }
    ],
    order_count: [
      { value: 'gt', label: 'Greater than (>)' },
      { value: 'lt', label: 'Less than (<)' },
      { value: 'gte', label: 'Greater than or equal (>=)' },
      { value: 'lte', label: 'Less than or equal (<=)' },
      { value: 'eq', label: 'Equals (=)' }
    ],
    city: [
      { value: 'eq', label: 'Is equal to' },
      { value: 'neq', label: 'Is not equal to' }
    ],
    age_group: [
      { value: 'eq', label: 'Is equal to' },
      { value: 'neq', label: 'Is not equal to' }
    ],
    last_order_date: [
      { value: 'days_since_gt', label: 'Idle for more than (days)' },
      { value: 'days_since_lt', label: 'Idle for less than (days)' }
    ],
    tags: [
      { value: 'contains', label: 'Contains tag' },
      { value: 'not_contains', label: 'Does not contain tag' }
    ]
  };

  const fetchSegmentsList = async () => {
    try {
      setLoading(true);
      const data = await api.getSegments();
      setSegments(data.segments);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch segments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegmentsList();
  }, []);

  // AI Prompt Parsing trigger
  const handleAiParse = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    try {
      setAiLoading(true);
      setSuggestedResult(null);
      const result = await api.suggestSegment(aiPrompt);
      setSuggestedResult(result);
      setSegmentName(result.name || '');
      setSegmentDesc(result.description || '');
    } catch (err) {
      alert('AI Translation error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Save AI segment
  const handleSaveAiSegment = async () => {
    if (!segmentName.trim() || !suggestedResult) return;

    try {
      setAiLoading(true);
      await api.createSegment({
        name: segmentName,
        description: segmentDesc,
        rules: suggestedResult.rules,
        created_by: 'ai'
      });
      setSuggestedResult(null);
      setAiPrompt('');
      setActiveTab('list');
      fetchSegmentsList();
    } catch (err) {
      alert('Error saving segment: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Manual Builder Handlers
  const handleAddManualRule = () => {
    setManualRules([...manualRules, { field: 'total_spent', operator: 'gt', value: '' }]);
  };

  const handleRemoveManualRule = (index) => {
    const rulesCopy = [...manualRules];
    rulesCopy.splice(index, 1);
    setManualRules(rulesCopy);
  };

  const handleManualRuleChange = (index, key, val) => {
    const rulesCopy = [...manualRules];
    rulesCopy[index][key] = val;
    
    // Automatically set operator when field changes
    if (key === 'field') {
      rulesCopy[index].operator = operators[val][0].value;
      rulesCopy[index].value = '';
    }
    
    setManualRules(rulesCopy);
  };

  const handleManualPreview = async () => {
    // Basic validations
    const invalid = manualRules.some(r => r.value === '');
    if (invalid) {
      alert('Please fill out all rule filter values.');
      return;
    }

    try {
      setPreviewLoading(true);
      // Backend expects rules
      const res = await fetch('/api/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: manualRules })
      });
      const data = await res.json();
      setManualPreview(data);
    } catch (err) {
      alert('Failed to preview segment: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveManualSegment = async (e) => {
    e.preventDefault();
    if (!segmentName.trim()) {
      alert('Segment name is required.');
      return;
    }
    const invalid = manualRules.some(r => r.value === '');
    if (invalid) {
      alert('Please fill out all rule filter values.');
      return;
    }

    try {
      setPreviewLoading(true);
      await api.createSegment({
        name: segmentName,
        description: segmentDesc,
        rules: manualRules,
        created_by: 'manual'
      });
      setSegmentName('');
      setSegmentDesc('');
      setManualRules([{ field: 'total_spent', operator: 'gt', value: '' }]);
      setManualPreview(null);
      setActiveTab('list');
      fetchSegmentsList();
    } catch (err) {
      alert('Error creating manual segment: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteSegment = async (id) => {
    if (!confirm('Are you sure you want to delete this segment? This will not delete the customers, only the segment rules.')) return;
    try {
      await api.deleteSegment(id);
      fetchSegmentsList();
    } catch (err) {
      alert('Failed to delete segment: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-800/40 pb-5 gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-stone-100">
            Segments Hub
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Build custom filters using natural language commands or configure rule operators manually.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-stone-900 border border-stone-800/80 p-1 rounded-xl shrink-0 self-start md:self-center">
          <button
            onClick={() => { setActiveTab('list'); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition ${
              activeTab === 'list' ? 'bg-amber-600/10 text-amber-400 border border-amber-500/10' : 'text-stone-400 hover:text-stone-200'
            } cursor-pointer`}
          >
            Saved Segments
          </button>
          <button
            onClick={() => { setActiveTab('ai'); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition ${
              activeTab === 'ai' ? 'bg-amber-600/10 text-amber-400 border border-amber-500/10' : 'text-stone-400 hover:text-stone-200'
            } cursor-pointer`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Smart Builder</span>
          </button>
          <button
            onClick={() => { setActiveTab('manual'); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition ${
              activeTab === 'manual' ? 'bg-amber-600/10 text-amber-400 border border-amber-500/10' : 'text-stone-400 hover:text-stone-200'
            } cursor-pointer`}
          >
            Manual Builder
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* VIEW 1: Segments List */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card */}
          <div 
            onClick={() => setActiveTab('ai')}
            className="border-2 border-dashed border-stone-850 hover:border-amber-600/30 bg-stone-900/10 hover:bg-amber-600/5 p-6 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 min-h-[200px] group"
          >
            <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl group-hover:border-amber-500/20 group-hover:text-amber-400 transition-colors text-stone-500">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-display font-semibold text-stone-300 group-hover:text-stone-200 mt-4">Create Segment</h4>
            <p className="text-xs text-stone-500 mt-1 max-w-[200px]">
              Slice and dice your database with text commands or rules.
            </p>
          </div>

          {loading ? (
            <div className="col-span-1 md:col-span-2 p-10 flex justify-center items-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : (
            segments.map((seg) => (
              <div key={seg.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between hover-glass-card">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-display font-bold text-stone-200 leading-tight">{seg.name}</h4>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${
                      seg.created_by === 'ai' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-stone-800 text-stone-400 border-stone-750'
                    }`}>
                      {seg.created_by === 'ai' ? 'smart' : seg.created_by}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-2 leading-relaxed min-h-[2.5rem]">
                    {seg.description || 'No description provided.'}
                  </p>
                  
                  {/* Rule chip view */}
                  <div className="mt-4 flex flex-wrap gap-1.5 max-h-[60px] overflow-hidden">
                    {(Array.isArray(seg.rules) ? seg.rules : JSON.parse(seg.rules || '[]')).map((r, idx) => (
                      <span key={idx} className="text-[10px] font-mono text-stone-500 px-2 py-0.5 bg-stone-950 border border-stone-900 rounded">
                        {r.field} {r.operator} {r.value}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-stone-850 mt-6 pt-4 text-xs">
                  <div className="flex items-center space-x-1.5 text-stone-400 font-semibold font-display">
                    <Users className="w-4 h-4 text-stone-500" />
                    <span>{seg.customer_count} matched</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="p-1 text-stone-500 hover:text-red-400 rounded hover:bg-stone-850 transition cursor-pointer"
                    title="Delete Segment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: AI Segment Builder */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Prompt card (Left Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-2xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-stone-850 pb-3">
                <ListFilter className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-bold text-lg text-stone-100">
                  Smart Segment Wizard
                </h3>
              </div>

              <p className="text-stone-400 text-xs leading-normal">
                Describe the criteria of shoppers you want to segment.
              </p>

              <form onSubmit={handleAiParse} className="space-y-4">
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Find customers who ordered more than 3 times, spent over 1000 in total, and live in Bangalore or Delhi..."
                  className="w-full bg-stone-950 border border-stone-850 rounded-xl p-4 text-stone-300 text-sm focus:outline-none focus:border-amber-500/50 transition placeholder-stone-600 resize-none font-medium leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center justify-center space-x-2 w-full md:w-auto bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-6 py-3 rounded-xl text-sm transition shadow-[0_4px_25px_rgba(217,119,6,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deconstructing Prompt...</span>
                    </>
                  ) : (
                    <>
                      <ListFilter className="w-4 h-4" />
                      <span>Generate Rules</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sample prompts */}
              <div className="border-t border-stone-850 pt-4.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-2">Try these commands</span>
                <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
                  <button 
                    onClick={() => setAiPrompt("Find shoppers who spent over 500 in total, ordered at least twice, and live in Goa")}
                    className="bg-stone-900 hover:bg-stone-850 border border-stone-850 px-3 py-1.5 rounded-lg transition"
                  >
                    "Goa VIP regular shoppers..."
                  </button>
                  <button 
                    onClick={() => setAiPrompt("Find high spent customers in Pune who haven't ordered in 60 days")}
                    className="bg-stone-900 hover:bg-stone-850 border border-stone-850 px-3 py-1.5 rounded-lg transition"
                  >
                    "Pune churn risk regulars..."
                  </button>
                  <button 
                    onClick={() => setAiPrompt("Delhi customers in age group 25-34")}
                    className="bg-stone-900 hover:bg-stone-850 border border-stone-850 px-3 py-1.5 rounded-lg transition"
                  >
                    "Young adults in Delhi..."
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Result Preview Panel (Right Column) */}
          <div className="space-y-6">
            {!suggestedResult ? (
              <div className="border-2 border-dashed border-stone-850 rounded-2xl p-10 text-center flex flex-col justify-center items-center min-h-[300px] bg-stone-900/10">
                <HelpCircle className="w-8 h-8 text-stone-600 mb-3" />
                <h4 className="text-sm font-semibold text-stone-400">Rules Preview Panel</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-[200px]">
                  Submit a prompt to inspect recommended rules and customer matches.
                </p>
              </div>
            ) : (
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[350px] border border-amber-600/20 relative animate-pulse-subtle">
                <div className="space-y-5">
                  <div className="border-b border-stone-850 pb-3 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">Suggested Rules parsed</span>
                    <button 
                      onClick={() => setSuggestedResult(null)}
                      className="text-stone-500 hover:text-stone-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Editable Segment Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Segment Name</label>
                    <input
                      type="text"
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl px-3 py-2 text-stone-200 text-sm focus:outline-none focus:border-amber-500/40"
                    />
                  </div>

                  {/* Editable Segment Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Description</label>
                    <input
                      type="text"
                      value={segmentDesc}
                      onChange={(e) => setSegmentDesc(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-500/40"
                    />
                  </div>

                  {/* Rules summary */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Suggested Rules</label>
                    <div className="bg-stone-950 border border-stone-850 p-3 rounded-xl space-y-1 max-h-[120px] overflow-y-auto">
                      {suggestedResult.rules.map((rule, idx) => (
                        <div key={idx} className="flex justify-between items-center font-mono text-[10px] text-stone-400">
                          <span className="text-amber-500/80">{rule.field}</span>
                          <span className="text-stone-600">{rule.operator}</span>
                          <span className="text-stone-300">{rule.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matched Count */}
                  <div className="flex items-center space-x-2 bg-stone-950 border border-stone-850 p-3 rounded-xl">
                    <Users className="w-5 h-5 text-amber-500" />
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Matching Shoppers</span>
                      <span className="text-sm font-display font-bold text-stone-200">{suggestedResult.customer_count} accounts</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveAiSegment}
                  disabled={aiLoading || !segmentName.trim()}
                  className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-550 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-sm transition mt-6 shadow-[0_0_15px_rgba(217,119,6,0.15)] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Segment</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Manual Segment Builder */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rules editor (Left Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveManualSegment} className="glass-card p-6 rounded-2xl space-y-6">
              <div className="flex items-center space-x-2 border-b border-stone-850 pb-3">
                <ListFilter className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-bold text-lg text-stone-100">
                  Manual Query Builder
                </h3>
              </div>

              {/* Segment Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Segment Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Frequent Pastry Buyers"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800/60 rounded-xl px-4 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune customers with order_count > 3"
                    value={segmentDesc}
                    onChange={(e) => setSegmentDesc(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800/60 rounded-xl px-4 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-450 uppercase tracking-wider block">Filtering Rules</label>
                
                {manualRules.map((rule, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 items-center bg-stone-950/40 p-3 rounded-xl border border-stone-850">
                    
                    {/* Field */}
                    <div className="flex-1 w-full">
                      <select
                        value={rule.field}
                        onChange={(e) => handleManualRuleChange(idx, 'field', e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800/80 rounded-lg px-3 py-2 text-stone-300 text-xs focus:outline-none"
                      >
                        {fields.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Operator */}
                    <div className="flex-1 w-full">
                      <select
                        value={rule.operator}
                        onChange={(e) => handleManualRuleChange(idx, 'operator', e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800/80 rounded-lg px-3 py-2 text-stone-300 text-xs focus:outline-none"
                      >
                        {operators[rule.field].map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Value */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        required
                        placeholder="value"
                        value={rule.value}
                        onChange={(e) => handleManualRuleChange(idx, 'value', e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800/80 rounded-lg px-3 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-500/50"
                      />
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={manualRules.length === 1}
                      onClick={() => handleRemoveManualRule(idx)}
                      className="p-1.5 text-stone-600 hover:text-red-400 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddManualRule}
                  className="flex items-center space-x-1 border border-stone-800 hover:border-stone-700 bg-stone-900/40 hover:bg-stone-900 text-stone-400 hover:text-stone-200 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Filter Rule</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 border-t border-stone-850 pt-5">
                <button
                  type="button"
                  onClick={handleManualPreview}
                  disabled={previewLoading}
                  className="border border-stone-800 bg-stone-900 hover:bg-stone-850 text-stone-300 font-bold px-5 py-2.5 rounded-xl text-sm transition"
                >
                  {previewLoading ? 'Querying...' : 'Preview Segment'}
                </button>

                <button
                  type="submit"
                  disabled={previewLoading || !segmentName.trim()}
                  className="bg-amber-600 hover:bg-amber-550 text-stone-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-[0_0_15px_rgba(217,119,6,0.15)] cursor-pointer"
                >
                  Save Segment
                </button>
              </div>
            </form>
          </div>

          {/* Manual Result Preview Panel (Right Column) */}
          <div className="space-y-6">
            {!manualPreview ? (
              <div className="border-2 border-dashed border-stone-850 rounded-2xl p-10 text-center flex flex-col justify-center items-center min-h-[300px] bg-stone-900/10">
                <HelpCircle className="w-8 h-8 text-stone-600 mb-3" />
                <h4 className="text-sm font-semibold text-stone-400">Rules Preview Panel</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-[200px]">
                  Click 'Preview Segment' to calculate matched totals and inspect database profiles.
                </p>
              </div>
            ) : (
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[350px]">
                <div className="space-y-4">
                  <div className="border-b border-stone-850 pb-3 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-stone-500 tracking-wider uppercase">Segment Preview</span>
                    <button 
                      onClick={() => setManualPreview(null)}
                      className="text-stone-500 hover:text-stone-300 text-xs"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 bg-stone-950 border border-stone-850 p-3.5 rounded-xl">
                    <Users className="w-5 h-5 text-amber-500" />
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Matched Customers</span>
                      <span className="text-sm font-display font-bold text-stone-200">{manualPreview.count} shoppers</span>
                    </div>
                  </div>

                  {/* Preview of sample names */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Sample Customer Profiles</label>
                    <div className="divide-y divide-stone-850 bg-stone-950 border border-stone-850 rounded-xl max-h-[200px] overflow-y-auto">
                      {manualPreview.sample.map((cust) => (
                        <div key={cust.id} className="p-3 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-medium text-stone-300 block">{cust.name}</span>
                            <span className="text-[10px] text-stone-500 block">{cust.city} • Spend: ₹{cust.total_spent.toFixed(0)}</span>
                          </div>
                          <span className="text-[10px] text-stone-500">#{cust.order_count} ords</span>
                        </div>
                      ))}
                      {manualPreview.sample.length === 0 && (
                        <div className="p-4 text-center text-xs text-stone-600 italic">No customers match these rules.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
