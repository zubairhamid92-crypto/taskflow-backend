export const jobDescriptionPrompt = (
    title: string,
    experience: string
) => `
Generate a professional job description.

Job Title: ${title}

Experience: ${experience}

Return:

1. Summary

2. Responsibilities

3. Required Skills

4. Preferred Qualifications

Keep the response professional.
`;