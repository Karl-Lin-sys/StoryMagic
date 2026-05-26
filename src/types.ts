export interface StoryPage {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  audioData?: string;
}

export interface Story {
  pages: StoryPage[];
}
