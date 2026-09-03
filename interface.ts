import { User } from '@/types/interface';
export interface Poll {
    id: number;
    question: string;
    type: string;
    description: string;
    owner: User;
    options: string[];
    has_answered: string[];
    created_at: Date;
    updated_at: Date;
}