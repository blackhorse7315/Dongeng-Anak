export enum PageStatus {
  IDLE = 'idle',
  GENERATING_STORY = 'generating_story',
  GENERATING_IMAGES = 'generating_images',
  READING = 'reading',
  ERROR = 'error',
}

export interface StoryPage {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface Story {
  id: string;
  title: string;
  pages: StoryPage[];
  author: string;
  createdAt: number;
}
