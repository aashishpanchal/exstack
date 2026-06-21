import type {RequestHandler} from 'express';

export const emojiFavicon = (emoji: string): RequestHandler => {
	return (req, res, next) => {
		if (req.path === '/favicon.ico') {
			return res
				.setHeader('content-type', 'image/svg+xml')
				.send(
					`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" x="-0.1em" font-size="90">${emoji}</text></svg>`,
				);
		}
		return next();
	};
};
