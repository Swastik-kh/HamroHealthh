import React, { useState, useEffect, useRef } from 'react';
import { User, ConferenceGroup, ConferenceMessage } from '../types';
import { db } from '../firebase';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { Users, MessageSquare, Plus, X, Send, Search } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ConferenceProps {
  currentUser: User;
  allUsers: User[];
}

export const Conference: React.FC<ConferenceProps> = ({ currentUser, allUsers }) => {
  const [groups, setGroups] = useState<ConferenceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConferenceMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine eligible members based on role
  const eligibleMembers = React.useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') {
      return allUsers.filter(u => u.id !== currentUser.id);
    } else if (currentUser.role === 'HEALTH_SECTION') {
      // Palika user sees all ADMINs under them
      return allUsers.filter(u => u.role === 'ADMIN' && u.parentId === currentUser.id);
    } else if (currentUser.role === 'ADMIN') {
      // Admin sees all users in their organization
      return allUsers.filter(u => u.organizationName === currentUser.organizationName && u.id !== currentUser.id);
    }
    return [];
  }, [allUsers, currentUser]);

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return eligibleMembers;
    const lowerQuery = searchQuery.toLowerCase();
    return eligibleMembers.filter(m => 
      m.fullName.toLowerCase().includes(lowerQuery) || 
      m.organizationName.toLowerCase().includes(lowerQuery) ||
      m.designation.toLowerCase().includes(lowerQuery)
    );
  }, [eligibleMembers, searchQuery]);

  const canCreateGroup = currentUser.role === 'HEALTH_SECTION' || currentUser.role === 'ADMIN';

  useEffect(() => {
    const groupsRef = ref(db, 'conferenceGroups');
    const unsub = onValue(groupsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const groupList = Object.keys(data).map(key => ({ ...data[key], id: key })) as ConferenceGroup[];
        // Filter groups where current user is a member
        const myGroups = groupList.filter(g => g.members?.includes(currentUser.id));
        setGroups(myGroups);
      } else {
        setGroups([]);
      }
    });
    return () => unsub();
  }, [currentUser.id]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }
    const messagesRef = ref(db, `conferenceMessages/${selectedGroupId}`);
    const unsub = onValue(messagesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const msgList = Object.keys(data).map(key => ({ ...data[key], id: key })) as ConferenceMessage[];
        msgList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [selectedGroupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      alert('कृपया समूहको नाम र कम्तिमा एक सदस्य चयन गर्नुहोस्।');
      return;
    }

    const groupRef = push(ref(db, 'conferenceGroups'));
    const newGroup: Omit<ConferenceGroup, 'id'> = {
      name: newGroupName.trim(),
      createdBy: currentUser.id,
      members: [currentUser.id, ...selectedMembers],
      createdAt: new Date().toISOString()
    };

    await set(groupRef, newGroup);
    setShowCreateGroup(false);
    setNewGroupName('');
    setSelectedMembers([]);
    setSelectedGroupId(groupRef.key);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroupId) return;

    const msgRef = push(ref(db, `conferenceMessages/${selectedGroupId}`));
    const msg: Omit<ConferenceMessage, 'id'> = {
      groupId: selectedGroupId,
      senderId: currentUser.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    await set(msgRef, msg);
    setNewMessage('');
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex h-[calc(100vh-12rem)]">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-indigo-600" />
            कन्फरेन्स समूहहरू
          </h2>
          {canCreateGroup && (
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
              title="नयाँ समूह बनाउनुहोस्"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {groups.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              कुनै समूह छैन।
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${selectedGroupId === group.id ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${selectedGroupId === group.id ? 'bg-indigo-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold truncate">{group.name}</div>
                  <div className="text-xs opacity-70 truncate">{group.members.length} सदस्यहरू</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedGroup ? (
          <>
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {selectedGroup.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedGroup.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedGroup.members.map(mId => allUsers.find(u => u.id === mId)?.fullName || 'Unknown').join(', ')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const sender = allUsers.find(u => u.id === msg.senderId);
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                      {!isMe && <div className="text-[10px] font-bold text-indigo-600 mb-1">{sender?.fullName || 'Unknown'}</div>}
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="सन्देश लेख्नुहोस्..."
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={64} className="mb-4 opacity-20" />
            <p>च्याट सुरु गर्न समूह चयन गर्नुहोस्</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
            <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Users size={20} /> नयाँ समूह बनाउनुहोस्</h3>
              <button onClick={() => setShowCreateGroup(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">समूहको नाम</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="जस्तै: स्वास्थ्य शाखा टिम"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">सदस्यहरू चयन गर्नुहोस्</label>
                
                <div className="mb-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="नाम, संस्था वा पदबाट खोज्नुहोस्..."
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">कुनै सदस्य फेला परेन।</div>
                  ) : (
                    filteredMembers.map(member => (
                      <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, member.id]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-800">{member.fullName}</div>
                          <div className="text-xs text-slate-500">{member.organizationName} - {member.designation}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateGroup(false)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">बनाउनुहोस्</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
