import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import request from '../services/api';

export default function Requests() {
    const { token, user } = useContext(AuthContext);
    const { socket } = useSocket();
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetch = async () => {
        if (!token || !user) return;
        setLoading(true);
        try {
            const all = await request('/swap-requests/all', { token });
            const incomingFiltered = all
                .filter(r => String(r.toUser?._id) === String(user.id))
                .sort((a, b) => {
                    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            const outgoingFiltered = all
                .filter(r => String(r.fromUser?._id) === String(user.id))
                .sort((a, b) => {
                    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            setIncoming(incomingFiltered);
            setOutgoing(outgoingFiltered);
        } catch (err) {
            console.error(err);
            setIncoming([]);
            setOutgoing([]);
        }
        setLoading(false);
    };

    useEffect(() => { 
        if (user && token) {
            fetch(); 
        }
    }, [user, token]);

    useEffect(() => {
        if (!socket) return;

        const handleNewSwapRequest = () => {
            fetch();
        };

        const handleSwapRequestUpdated = () => {
            fetch();
        };

        socket.on('new-swap-request', handleNewSwapRequest);
        socket.on('swap-request-updated', handleSwapRequestUpdated);

        return () => {
            socket.off('new-swap-request', handleNewSwapRequest);
            socket.off('swap-request-updated', handleSwapRequestUpdated);
        };
    }, [socket, user, token]);

    const respond = async (id, accept) => {
        try {
            setLoading(true);
            const response = await request(`/swap-response/${id}`, { method: 'POST', token, body: { accept } });
            await fetch();
            if (accept) {
                toast.success('Swap accepted successfully! The slots have been swapped.');
            } else {
                toast.success('Swap rejected.');
            }
        } catch (err) { 
            toast.error(err.message || 'Response failed');
            await fetch();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Swap Requests</h2>
            {loading ? (
                <p className="text-center text-gray-600 py-8">Loading...</p>
            ) : (
                <>
                    <section className="mb-8">
                        <h3 className="text-xl font-semibold mb-4 text-gray-700">Incoming Requests</h3>
                        {incoming.length === 0 ? (
                            <p className="text-gray-500 py-4">No incoming requests.</p>
                        ) : (
                            <ul className="list-none p-0 m-0">
                                {incoming.map(i => (
                                    <li key={i._id} className="flex justify-between items-center gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1">
                                            <p className="text-gray-800 mb-2">
                                                <span className="font-bold">{i.fromUser?.name}</span> wants to swap their{' '}
                                                <span className="font-bold">{i.mySlot?.title}</span> ({new Date(i.mySlot?.startTime).toLocaleString()}) 
                                                for your <span className="font-bold">{i.theirSlot?.title}</span> ({new Date(i.theirSlot?.startTime).toLocaleString()})
                                            </p>
                                            <div className="muted">
                                                Status: <strong className={i.status === 'ACCEPTED' ? 'text-green-600' : i.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}>
                                                    {i.status}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {i.status === 'PENDING' ? (
                                                <>
                                                    <button 
                                                        onClick={() => respond(i._id, true)} 
                                                        disabled={loading}
                                                        className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button 
                                                        onClick={() => respond(i._id, false)} 
                                                        disabled={loading}
                                                        className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="muted">
                                                    {i.status === 'ACCEPTED' ? '✓ Accepted' : i.status === 'REJECTED' ? '✗ Rejected' : i.status}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-4 text-gray-700">Outgoing Requests</h3>
                        {outgoing.length === 0 ? (
                            <p className="text-gray-500 py-4">No outgoing requests.</p>
                        ) : (
                            <ul className="list-none p-0 m-0">
                                {outgoing.map(o => (
                                    <li key={o._id} className="flex justify-between items-center gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1">
                                            <p className="text-gray-800 mb-2">
                                                To: <span className="font-bold">{o.toUser?.name}</span> — Offered: <span className="font-bold">{o.mySlot?.title}</span> for <span className="font-bold">{o.theirSlot?.title}</span>
                                            </p>
                                            <div className="muted">
                                                Status: <strong className={o.status === 'ACCEPTED' ? 'text-green-600' : o.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}>
                                                    {o.status}
                                                </strong>
                                            </div>
                                        </div>
                                        {o.status === 'PENDING' && (
                                            <div className="muted italic">Waiting for response...</div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
