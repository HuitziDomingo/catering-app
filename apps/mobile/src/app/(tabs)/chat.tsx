import { ChatScreen } from '../../features/chat/feature/ChatScreen';

// Ruta delgada (Expo Router, ADR-017): solo importa y renderiza lo que vive
// en features/. Sin lógica de UI/negocio aquí (ver ADR-020).
export const ChatRoute = ChatScreen;

export default ChatRoute;
