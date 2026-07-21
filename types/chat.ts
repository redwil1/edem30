export interface Participant {
  id: number;

  name: string;

  isYou?: boolean;

  isDriver?: boolean;
}

export interface ChatMessage {
  id: number;

  author: string;

  role: "driver" | "user" | "participant";

  text: string;

  time: string;
}
