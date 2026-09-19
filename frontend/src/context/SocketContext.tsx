import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Incident, Resource, AlertNotification, AuditEntry } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  lastIncidentUpdate: { incidentId: string; changes: Partial<Incident>; audit?: AuditEntry } | null;
  lastResourceUpdate: Resource | null;
  lastAlert: AlertNotification | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  lastIncidentUpdate: null,
  lastResourceUpdate: null,
  lastAlert: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastIncidentUpdate, setLastIncidentUpdate] = useState<any>(null);
  const [lastResourceUpdate, setLastResourceUpdate] = useState<any>(null);
  const [lastAlert, setLastAlert] = useState<any>(null);

  useEffect(() => {
    const socketInstance = io({
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to live EOC dispatch gateway:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected from EOC gateway');
      setConnected(false);
    });

    socketInstance.on('incident.updated', (data) => {
      console.log('[Socket Event] incident.updated', data);
      setLastIncidentUpdate(data);
    });

    socketInstance.on('resource.updated', (data) => {
      console.log('[Socket Event] resource.updated', data);
      setLastResourceUpdate(data);
    });

    socketInstance.on('alert.created', (data) => {
      console.log('[Socket Event] alert.created', data);
      setLastAlert(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        lastIncidentUpdate,
        lastResourceUpdate,
        lastAlert,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
