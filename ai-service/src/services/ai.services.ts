import geminiProvider from "../providers/gemini.provider";
import { jobDescriptionPrompt } from "../prompts/jobDescription.prompt";

class AIService {

    async generateJobDescription(
        title: string,
        experience: string
    ) {

        const prompt =
            jobDescriptionPrompt(title, experience);

        return geminiProvider.generate(prompt);

    }

}

export default new AIService();