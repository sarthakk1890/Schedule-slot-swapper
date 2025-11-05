import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import request from '../services/api';

export default function Dashboard() {
    const { token, user } = useContext(AuthContext);
    const { socket } = useSocket();
    const [events, setEvents] = useState([]);
    const [form, setForm] = useState({ title: '', startTime: '', endTime: '' });
    const [loading, setLoading] = useState(false);

    const fetchEvents = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await request('/events/me', { token });
            setEvents(data);
        } catch (err) { 
            console.error(err); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        if (token && user) {
            fetchEvents(); 
        }
    }, [token, user]);

    useEffect(() => {
        if (!socket) return;

        const handleSwapCompleted = (data) => {
            fetchEvents();
        };

        const handleSwapRequestAccepted = (data) => {
            fetchEvents();
        };

        const handleSwapRequestRejected = (data) => {
            fetchEvents();
        };

        const handleNewEvent = () => {
            fetchEvents();
        };

        const handleEventUpdated = () => {
            fetchEvents();
        };

        socket.on('swap-completed', handleSwapCompleted);
        socket.on('swap-request-accepted', handleSwapRequestAccepted);
        socket.on('swap-request-rejected', handleSwapRequestRejected);
        socket.on('new-swappable-slot', handleNewEvent);
        socket.on('slot-no-longer-swappable', handleEventUpdated);

        return () => {
            socket.off('swap-completed', handleSwapCompleted);
            socket.off('swap-request-accepted', handleSwapRequestAccepted);
            socket.off('swap-request-rejected', handleSwapRequestRejected);
            socket.off('new-swappable-slot', handleNewEvent);
            socket.off('slot-no-longer-swappable', handleEventUpdated);
        };
    }, [socket, token, user]);

    const createEvent = async (e) => {
        e.preventDefault();
        try {
            await request('/events', {
                method: 'POST', token, body: {
                    title: form.title,
                    startTime: new Date(form.startTime).toISOString(),
                    endTime: new Date(form.endTime).toISOString()
                }
            });
            setForm({ title: '', startTime: '', endTime: '' });
            await fetchEvents();
            toast.success('Event created successfully!');
        } catch (err) { 
            toast.error(err.message || 'Create failed');
        }
    };

    const toggleSwappable = async (ev) => {
        try {
            const newStatus = ev.status === 'SWAPPABLE' ? 'BUSY' : 'SWAPPABLE';
            await request(`/events/${ev._id}`, { method: 'PUT', token, body: { status: newStatus } });
            await fetchEvents();
            toast.success(`Event marked as ${newStatus}`);
        } catch (err) { 
            toast.error(err.message || 'Update failed');
        }
    };

    const deleteEvent = async (id) => {
        const confirmed = await new Promise((resolve) => {
            toast(
                (t) => (
                    <div>
                        <p className="mb-2">Delete this event?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    resolve(true);
                                }}
                                className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    resolve(false);
                                }}
                                className="px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
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
            await request(`/events/${id}`, { method: 'DELETE', token });
            await fetchEvents();
            toast.success('Event deleted successfully!');
        } catch (err) { 
            toast.error(err.message || 'Delete failed');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">My Events</h2>

            <form className="flex gap-2 mb-6 flex-wrap" onSubmit={createEvent}>
                <input 
                    value={form.title} 
                    onChange={e => setForm({ ...form, title: e.target.value })} 
                    placeholder="Title" 
                    className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required 
                />
                <input 
                    type="datetime-local" 
                    value={form.startTime} 
                    onChange={e => setForm({ ...form, startTime: e.target.value })} 
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required 
                />
                <input 
                    type="datetime-local" 
                    value={form.endTime} 
                    onChange={e => setForm({ ...form, endTime: e.target.value })} 
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required 
                />
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                    Create
                </button>
            </form>

            {loading ? (
                <p className="text-center text-gray-600 py-8">Loading...</p>
            ) : events.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No events found. Create your first event!</p>
            ) : (
                <ul className="list-none p-0 m-0">
                    {events.map(ev => (
                        <li key={ev._id} className="flex justify-between items-center gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 mb-1">{ev.title}</h3>
                                <div className="muted">
                                    {new Date(ev.startTime).toLocaleString()} — {new Date(ev.endTime).toLocaleString()}
                                </div>
                                <div className="muted">
                                    Status: <span className={`font-medium ${ev.status === 'SWAPPABLE' ? 'text-green-600' : 'text-gray-600'}`}>
                                        {ev.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <button 
                                    onClick={() => toggleSwappable(ev)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                                >
                                    {ev.status === 'SWAPPABLE' ? 'Unmark Swappable' : 'Make Swappable'}
                                </button>
                                <button 
                                    onClick={() => deleteEvent(ev._id)}
                                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
