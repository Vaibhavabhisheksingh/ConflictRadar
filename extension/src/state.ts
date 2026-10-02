import type { Socket } from 'socket.io-client';


export interface ConnectionState {
  socket?: Socket;
  projectCode?: string;
  name?: string;
}

export const connectionState: ConnectionState = {};
