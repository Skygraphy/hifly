import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`HiFly server running on http://localhost:${port}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
