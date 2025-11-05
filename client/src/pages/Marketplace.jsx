import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import request from '../services/api';

export default function Marketplace() {
    const { token, user } = useContext(AuthContext);
    const { socket } = useSocket();
    const [swappableSlots, setSwappableSlots] = useState([]);
    const [mySlots, setMySlots] = useState([]);
    const [selectedMySlot, setSelectedMySlot] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchSwappableSlots = async () => {
        if (!token) return;
        try {
            const data = await request('/swappable-slots', { token });
            setSwappableSlots(data);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to load swappable slots');
        }
    };

    const fetchMySlots = async () => {
        if (!token) return;
        try {
            const data = await request('/events/me', { token });
            const swappable = data.filter(slot => slot.status === 'SWAPPABLE');
            setMySlots(swappable);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (token && user) {
            setLoading(true);
            Promise.all([fetchSwappableSlots(), fetchMySlots()]).finally(() => {
                setLoading(false);
            });
        }
    }, [token, user]);

    useEffect(() => {
        if (!socket) return;

        const handleNewSwappableSlot = (data) => {
            if (data.event && data.event.owner?._id !== user?.id) {
                fetchSwappableSlots();
            }
        };

        const handleSlotNoLongerSwappable = (data) => {
            setSwappableSlots(prev => prev.filter(slot => slot._id !== data.eventId));
            fetchSwappableSlots();
        };

        socket.on('new-swappable-slot', handleNewSwappableSlot);
        socket.on('slot-no-longer-swappable', handleSlotNoLongerSwappable);

        return () => {
            socket.off('new-swappable-slot', handleNewSwappableSlot);
            socket.off('slot-no-longer-swappable', handleSlotNoLongerSwappable);
        };
    }, [socket, user]);

    const requestSwap = async (theirSlotId) => {
        if (!selectedMySlot) {
            toast.error('Please select one of your swappable slots first');
            return;
        }

        const confirmed = await new Promise((resolve) => {
            toast(
                (t) => (
                    <div>
                        <p className="mb-2">Request swap with this slot?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    resolve(true);
                                }}
                                className="px-4 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    resolve(false);
                                }}
                                className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ),
                { duration: Infinity }
            );
        });

        if (!confirmed) return;

        try {
            await request('/swap-request', {
                method: 'POST',
                token,
                body: {
                    mySlotId: selectedMySlot,
                    theirSlotId: theirSlotId
                }
            });
            toast.success('Swap request sent!');
            await fetchSwappableSlots();
            await fetchMySlots();
            setSelectedMySlot('');
        } catch (err) {
            toast.error(err.message || 'Failed to create swap request');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Marketplace</h2>
            <p className="text-gray-600 mb-6">Browse swappable slots from other users</p>

            {mySlots.length > 0 && (
                <div className="mb-6">
                    <label className="flex items-center gap-2 flex-wrap">
                        <strong className="text-gray-700">Select your slot to swap:</strong>
                        <select
                            value={selectedMySlot}
                            onChange={(e) => setSelectedMySlot(e.target.value)}
                            className="ml-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                            <option value="">-- Choose your slot --</option>
                            {mySlots.map(slot => (
                                <option key={slot._id} value={slot._id}>
                                    {slot.title} ({new Date(slot.startTime).toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            {error && <div className="error">{error}</div>}

            {loading ? (
                <p className="text-center text-gray-600 py-8">Loading...</p>
            ) : swappableSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No swappable slots available</p>
            ) : (
                <ul className="list-none p-0 m-0">
                    {swappableSlots.map(slot => (
                        <li key={slot._id} className="flex justify-between items-center gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 mb-1">{slot.title}</h3>
                                <div className="muted">
                                    {new Date(slot.startTime).toLocaleString()} — {new Date(slot.endTime).toLocaleString()}
                                </div>
                                <div className="muted">
                                    Owner: <span className="font-medium">{slot.owner?.name || 'Unknown'}</span>
                                </div>
                                <div className="muted">
                                    Status: <span className="font-medium text-green-600">{slot.status}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => requestSwap(slot._id)}
                                    disabled={!selectedMySlot || mySlots.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Request Swap
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

