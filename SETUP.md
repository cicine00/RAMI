# Development Environment Setup

To set up the development environment for the RAMI project, follow these instructions:

1. **Prerequisites**:
   - Ensure you have [Node.js](https://nodejs.org/) installed.
   - Install [Git](https://git-scm.com/) for version control.

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/cicine00/RAMI.git
   cd RAMI
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Set Up Database**:
   - Create a database in your preferred SQL server.
   - Update the database connection parameters in the `.env` file.

5. **Run Migrations**:
   ```bash
   npm run migrate
   ```

6. **Start Development Server**:
   ```bash
   npm start
   ```

7. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3000` to access the application.

### Troubleshooting
- If you encounter any issues, check the console for errors and ensure all the prerequisites are installed correctly.