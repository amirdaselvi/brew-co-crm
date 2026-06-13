import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Eye,
  Coffee
} from 'lucide-react';

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  
  // Step 1: Target Segment
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [selectedSegment, setSelectedSegment] = useState(null);

  // Step 2: Channel
  const [selectedChannel, setSelectedChannel] = useState('whatsapp'); // 'whatsapp', 'sms', 'email', 'rcs'

  // Step 3: Message & AI Writing
  const [messageTemplate, setMessageTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafts, setAiDrafts] = useState(null); // { message, subject, variants }

  // Step 4: Dispatch/Loading
  const [dispatching, setDispatching] = useState(false);

  const fetchCampaignsAndSegments = async () => {
    try {
      setLoading(true);
      const campData = await api.getCampaigns();
      const segData = await api.getSegments();
      setCampaigns(campData.campaigns);
      setSegments(segData.segments);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch campaigns or segments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignsAndSegments();
  }, []);

  // Update selected segment profile details
  useEffect(() => {
    if (selectedSegmentId) {
      const seg = segments.find(s => s.id === parseInt(selectedSegmentId));
      setSelectedSegment(seg || null);
    } else {
      setSelectedSegment(null);
    }
  }, [selectedSegmentId, segments]);

  // AI draft copywriting trigger
  const handleAiDraftMessage = async () => {
    if (!selectedSegmentId) {
      alert('Please select a target segment in Step 1 first.');
      return;
    }
    
    try {
      setAiLoading(true);
      const drafts = await api.draftMessage({
        segmentId: parseInt(selectedSegmentId),
        channel: selectedChannel,
        prompt: aiPrompt,
        subject: selectedChannel === 'email' ? 'Welcome back Offer!' : ''
      });
      setAiDrafts(drafts);
      // Autofill main editor with the primary suggested message
      setMessageTemplate(drafts.message || '');
      if (drafts.subject) {
        setEmailSubject(drafts.subject.replace('{{name}}', 'Customer'));
      }
    } catch (err) {
      alert('AI Copywriter error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Launch E2E Send campaign trigger
  const handleDispatchCampaign = async () => {
    if (!campaignName.trim()) {
      alert('Please provide a campaign name.');
      return;
    }
    if (!messageTemplate.trim()) {
      alert('Please draft a message template.');
      return;
    }

    try {
      setDispatching(true);
      
      // 1. Create campaign in DB
      const createdCampaign = await api.createCampaign({
        name: campaignName,
        segment_id: parseInt(selectedSegmentId),
        channel: selectedChannel,
        message_template: messageTemplate,
        subject: selectedChannel === 'email' ? emailSubject : null
      });

      // 2. Dispatch to channel service
      await api.sendCampaign(createdCampaign.id);

      // Reset wizard
      setShowWizard(false);
      resetWizardStates();
      
      // Navigate to detailed logs
      navigate(`/campaigns/${createdCampaign.id}`);
    } catch (err) {
      alert('Campaign dispatch failure: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  const resetWizardStates = () => {
    setWizardStep(1);
    setCampaignName('');
    setSelectedSegmentId('');
    setSelectedChannel('whatsapp');
    setMessageTemplate('');
    setEmailSubject('');
    setAiPrompt('');
    setAiDrafts(null);
  };

  const channelsList = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, desc: 'Casual templates, high open rates (98%)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'sms', name: 'SMS', icon: Smartphone, desc: 'Short texts, wide offline reach', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { id: 'email', name: 'Email', icon: Mail, desc: 'Rich letters, perfect for newsletters', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { id: 'rcs', name: 'RCS', icon: Smartphone, desc: 'Next-gen rich media mobile text', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-800/40 pb-5">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-stone-100">
            Campaigns Control Room
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Dispatch promotional broadcasts and monitor real-time delivery funnels.
          </p>
        </div>

        {!showWizard && (
          <button
            onClick={() => { resetWizardStates(); setShowWizard(true); }}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-sm px-5 py-2.5 rounded-xl transition duration-150 shadow-[0_4px_20px_rgba(217,119,6,0.25)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Campaign List View */}
      {!showWizard ? (
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <span className="text-stone-400 text-sm">Aligning communications satlogs...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-20 text-center text-stone-500 text-sm space-y-3">
              <p>No campaigns have been launched yet.</p>
              <button 
                onClick={() => setShowWizard(true)}
                className="text-amber-500 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-2 rounded-xl text-xs font-semibold transition mt-2 cursor-pointer"
              >
                Assemble Campaign Wizard
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-stone-300">
                <thead>
                  <tr className="border-b border-stone-850 text-stone-500 text-xs uppercase tracking-wider font-semibold bg-stone-900/10">
                    <th className="py-4.5 px-6">Campaign Info</th>
                    <th className="py-4.5 px-6">Segment Target</th>
                    <th className="py-4.5 px-6">Channel</th>
                    <th className="py-4.5 px-6">Status</th>
                    <th className="py-4.5 px-6 text-right">Sent</th>
                    <th className="py-4.5 px-6 text-right">Delivered / Read</th>
                    <th className="py-4.5 px-6 text-right">Clicks</th>
                    <th className="py-4.5 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900">
                  {campaigns.map((camp) => {
                    const stats = camp.stats || {};
                    const delPct = stats.total_sent ? (stats.delivered / stats.total_sent) * 100 : 0;
                    const readPct = stats.delivered ? (stats.read / stats.delivered) * 100 : 0;
                    const clickPct = stats.read ? (stats.clicked / stats.read) * 100 : 0;
                    
                    return (
                      <tr key={camp.id} className="hover:bg-stone-900/25 transition-all group">
                        <td className="py-4 px-6 font-semibold text-stone-200">
                          <Link to={`/campaigns/${camp.id}`} className="hover:text-amber-400 block transition">
                            {camp.name}
                          </Link>
                          <span className="text-[10px] text-stone-500 block font-normal mt-0.5">
                            ID: #CAM-{camp.id} • Launched {new Date(camp.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-stone-400">
                          <div className="flex items-center space-x-1.5 font-medium">
                            <Users className="w-3.5 h-3.5 text-stone-600" />
                            <span>{camp.segment_name || 'Unknown Segment'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 capitalize">
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded border bg-stone-900 border-stone-850 text-stone-400">
                            {camp.channel}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                            camp.status === 'completed' || camp.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                              : camp.status === 'sending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/15 animate-pulse'
                              : 'bg-stone-800 text-stone-400 border-stone-750'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-display text-stone-400 font-semibold">
                          {stats.total_sent || 0}
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-stone-400 space-y-0.5">
                          <div className="font-display font-medium">
                            {stats.delivered || 0} <span className="text-[10px] text-stone-550">({delPct.toFixed(0)}%)</span>
                          </div>
                          <div className="text-[10px] text-stone-500">
                            Reads: {stats.read || 0} ({readPct.toFixed(0)}%)
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-display font-bold text-amber-500/90 text-xs">
                          {stats.clicked || 0} <span className="text-[10px] text-stone-500 font-normal">({clickPct.toFixed(0)}%)</span>
                        </td>
                        <td className="py-4 px-6">
                          <Link 
                            to={`/campaigns/${camp.id}`} 
                            className="inline-flex items-center space-x-1 border border-stone-800 hover:border-stone-700 bg-stone-900/40 hover:bg-stone-900 text-stone-400 hover:text-stone-200 px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Logs</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* WIZARD CONTAINER */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Wizard Steps Indicator Sidebar (Left Column) */}
          <div className="lg:col-span-1 glass-card p-5 rounded-2xl h-fit space-y-4">
            <h4 className="font-display font-bold text-sm text-stone-400 uppercase tracking-wider border-b border-stone-850 pb-2">Wizard Steps</h4>
            <div className="space-y-3">
              {[
                { step: 1, name: 'Target Segment', desc: 'Select recipient list' },
                { step: 2, name: 'Channel Choice', desc: 'Choose WhatsApp/SMS/Email' },
                { step: 3, name: 'AI Copywriter', desc: 'Personalize templates' },
                { step: 4, name: 'Review & Dispatch', desc: 'Send campaign live' },
              ].map((s) => (
                <div 
                  key={s.step} 
                  className={`flex items-start space-x-3 p-2 rounded-xl transition ${
                    wizardStep === s.step ? 'bg-stone-900/60' : 'opacity-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-display text-xs font-bold shrink-0 mt-0.5 ${
                    wizardStep > s.step 
                      ? 'bg-emerald-500 text-stone-950' 
                      : wizardStep === s.step 
                      ? 'bg-amber-500 text-stone-950' 
                      : 'bg-stone-800 text-stone-400'
                  }`}>
                    {wizardStep > s.step ? '✓' : s.step}
                  </span>
                  <div>
                    <h5 className={`text-xs font-semibold ${wizardStep === s.step ? 'text-amber-400' : 'text-stone-300'}`}>
                      {s.name}
                    </h5>
                    <p className="text-[10px] text-stone-500 leading-normal mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowWizard(false)}
              className="text-xs text-stone-500 hover:text-stone-300 block pt-3 border-t border-stone-850 w-full text-center transition cursor-pointer"
            >
              Cancel & Exit
            </button>
          </div>

          {/* Wizard Core Content Card (Right columns) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-card p-6 rounded-2xl min-h-[400px] flex flex-col justify-between">
              
              {/* STEP 1: Select Segment */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-100">Target Segment</h3>
                    <p className="text-stone-500 text-xs mt-1">Select the customer audience segment you want to broadcast this campaign to.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Campaign Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Brew & Co. Winter Hot Mocha Promo"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800/80 rounded-xl px-4 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500/50 transition"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Audience Segment</label>
                      <select
                        value={selectedSegmentId}
                        onChange={(e) => setSelectedSegmentId(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800/80 rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                      >
                        <option value="">-- Choose Target Segment --</option>
                        {segments.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.customer_count} matched)</option>
                        ))}
                      </select>
                    </div>

                    {selectedSegment && (
                      <div className="bg-stone-950 border border-stone-850 p-4 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-center space-x-1.5 text-amber-500 font-semibold uppercase tracking-wider text-[10px]">
                          <Users className="w-3.5 h-3.5" />
                          <span>Segment Summary</span>
                        </div>
                        <p className="text-stone-300 font-medium">{selectedSegment.description}</p>
                        <div className="text-[10px] text-stone-500 flex flex-wrap gap-1 items-center">
                          <span className="mr-1">Active filters:</span>
                          {(Array.isArray(selectedSegment.rules) ? selectedSegment.rules : JSON.parse(selectedSegment.rules || '[]')).map((r, idx) => (
                            <span key={idx} className="text-[10px] font-mono text-stone-400 px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded">
                              {r.field} {r.operator} {r.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Select Channel */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-100">Select Channel</h3>
                    <p className="text-stone-500 text-xs mt-1">Select the delivery channel for dispatch. WhatsApp and SMS typically drive higher response values.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channelsList.map((ch) => {
                      const Icon = ch.icon;
                      const isSel = selectedChannel === ch.id;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedChannel(ch.id)}
                          className={`border p-4.5 rounded-xl flex items-start space-x-4 cursor-pointer transition ${
                            isSel 
                              ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(217,119,6,0.08)]' 
                              : 'border-stone-850 bg-stone-900/10 hover:bg-stone-900/30'
                          }`}
                        >
                          <div className={`p-2.5 rounded-xl border ${ch.color} shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-stone-200 text-sm capitalize">{ch.name}</h4>
                            <p className="text-[11px] text-stone-500 leading-normal mt-1">{ch.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Message & AI Writing */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-100 flex items-center space-x-1.5">
                      <Coffee className="w-5 h-5 text-amber-500 animate-pulse" />
                      <span>Copywriting Assistant</span>
                    </h3>
                    <p className="text-stone-500 text-xs mt-1">Describe your promotion to generate suggested copy options, or write your own template directly.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    
                    {/* Left: AI Input Prompt */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Describe campaign goal / promotion</label>
                        <textarea
                          rows={3}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g. Write a cozy winter invite offering Delhi shoppers 25% off mocha drinks on rainy days..."
                          className="w-full bg-stone-900 border border-stone-800/80 rounded-xl p-3.5 text-stone-300 text-xs focus:outline-none focus:border-amber-500/50 transition resize-none placeholder-stone-600 font-medium"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAiDraftMessage}
                        disabled={aiLoading || !aiPrompt.trim()}
                        className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-4.5 py-2.5 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating drafts...</span>
                          </>
                        ) : (
                          <>
                            <Coffee className="w-3.5 h-3.5" />
                            <span>Suggest Copy Options</span>
                          </>
                        )}
                      </button>

                      {/* Display AI alternative drafts */}
                      {aiDrafts && (
                        <div className="space-y-2 mt-4.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Alternative Drafts (Click to apply)</span>
                          <div className="space-y-2">
                            {aiDrafts.variants.map((v, idx) => (
                              <div
                                key={idx}
                                onClick={() => setMessageTemplate(v)}
                                className="bg-stone-950 border border-stone-850 hover:border-amber-500/20 p-3 rounded-xl text-xs text-stone-400 hover:text-stone-300 transition-all cursor-pointer font-medium italic"
                              >
                                "{v}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actual Template Editor */}
                    <div className="space-y-4">
                      {selectedChannel === 'email' && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Email Subject Line</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Free hot pastry inside!"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800/80 rounded-xl px-3.5 py-2 text-stone-200 text-xs focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Message Template Editor</label>
                        <textarea
                          rows={7}
                          value={messageTemplate}
                          onChange={(e) => setMessageTemplate(e.target.value)}
                          placeholder="Hey {{name}}! Grab your winter hot mocha today..."
                          className="w-full bg-stone-900 border border-stone-800/80 rounded-xl p-3.5 text-stone-200 text-xs focus:outline-none focus:border-amber-500/50 font-medium leading-relaxed"
                        />
                        <span className="text-[10px] text-stone-500 block">
                          Tip: Use <strong>{`{{name}}`}</strong> to inject the customer's first name dynamically.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Dispatch */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-100">Review & Dispatch</h3>
                    <p className="text-stone-500 text-xs mt-1">Review target size, channel configs, and message details before launching the broadcast campaign.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Campaign Configuration specs */}
                    <div className="glass-card p-5 rounded-2xl divide-y divide-stone-850 space-y-4">
                      <div className="pb-3 flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Campaign Name:</span>
                        <span className="text-stone-200 font-bold">{campaignName}</span>
                      </div>
                      
                      <div className="py-3 flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Target Audience:</span>
                        <span className="text-stone-200 font-bold">{selectedSegment ? selectedSegment.name : '-'}</span>
                      </div>

                      <div className="py-3 flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Engagement Channel:</span>
                        <span className="text-stone-200 font-bold uppercase tracking-wider">{selectedChannel}</span>
                      </div>

                      <div className="py-3 flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Broadcasting size:</span>
                        <span className="text-amber-500 font-bold font-display text-sm">{selectedSegment ? selectedSegment.customer_count : 0} contacts</span>
                      </div>
                    </div>

                    {/* Copy preview mockup */}
                    <div className="border border-stone-850 bg-stone-950 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                      <span className="text-[9px] font-bold text-stone-600 tracking-wider uppercase block border-b border-stone-900 pb-1.5">Personalized Preview (Aarav Sharma)</span>
                      
                      {selectedChannel === 'email' && emailSubject && (
                        <div className="text-xs text-stone-300 font-bold">
                          Subject: <span className="font-normal text-stone-400">{emailSubject.replace('{{name}}', 'Aarav')}</span>
                        </div>
                      )}
                      
                      <p className="text-xs font-medium text-stone-400 italic leading-relaxed">
                        "{messageTemplate.replace('{{name}}', 'Aarav')}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Footer */}
              <div className="flex justify-between items-center border-t border-stone-850 mt-8 pt-5">
                <button
                  type="button"
                  onClick={() => setWizardStep(s => Math.max(s - 1, 1))}
                  disabled={wizardStep === 1 || dispatching}
                  className="flex items-center space-x-1 border border-stone-800 hover:border-stone-700 bg-stone-900/40 text-stone-450 hover:text-stone-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Custom Step Validations
                      if (wizardStep === 1 && (!campaignName.trim() || !selectedSegmentId)) {
                        alert('Please enter a campaign name and select a target segment.');
                        return;
                      }
                      if (wizardStep === 3 && !messageTemplate.trim()) {
                        alert('Please enter a message template.');
                        return;
                      }
                      setWizardStep(s => Math.min(s + 1, 4));
                    }}
                    className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-550 text-stone-950 font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDispatchCampaign}
                    disabled={dispatching}
                    className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-[0_4px_25px_rgba(217,119,6,0.25)] cursor-pointer"
                  >
                    {dispatching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending broadcast...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Dispatch Campaign</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
