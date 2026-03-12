# Deployment Instructions for Render

This document provides step-by-step instructions to deploy your Anime API Pinger service to Render, a cloud platform that allows you to host web services, background workers, and more. This will ensure your service runs 24/7 independently.

## Prerequisites

1.  **Render Account**: If you don't have one, sign up for a free account at [Render.com](https://render.com/).
2.  **GitHub Account**: Your project needs to be hosted on GitHub (or GitLab/Bitbucket) for Render to connect and deploy it. If you haven't already, create a new repository on GitHub and push the `main.py`, `requirements.txt`, `Procfile`, and `runtime.txt` files to it.

## Deployment Steps

Follow these steps to deploy your API Pinger as a **Background Worker** on Render:

1.  **Log in to Render**: Go to [Render.com](https://render.com/) and log in to your account.

2.  **Create a New Background Worker**: 
    *   From your Render dashboard, click on the "New" button in the top right corner.
    *   Select "Background Worker" from the dropdown menu.

3.  **Connect to Your Repository**: 
    *   Choose your Git provider (e.g., GitHub) and connect it to Render if you haven't already.
    *   Select the repository where you pushed your `anime_api_pinger` project files.

4.  **Configure Your Worker**: 
    *   **Name**: Give your worker a descriptive name (e.g., `anime-api-pinger`).
    *   **Region**: Choose a region closest to your target API or your location for better performance.
    *   **Branch**: Specify the branch you want to deploy from (e.g., `main` or `master`).
    *   **Root Directory**: If your project files are in a subdirectory within your repository, specify it here (e.g., `/anime_api_pinger`). If they are at the root, leave this blank.
    *   **Runtime**: Render should automatically detect Python. Ensure it's set to `Python 3`.
    *   **Build Command**: Enter the command to install your dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    *   **Start Command**: Enter the command to run your Python script:
        ```bash
        python main.py
        ```
    *   **Instance Type**: For a continuous background task, the "Free" instance type should suffice for basic usage. If you require more resources or guaranteed uptime, consider upgrading.

5.  **Create Background Worker**: Click the "Create Background Worker" button.

Render will now start building and deploying your service. You can monitor the deployment logs in the Render dashboard. Once deployed, your Python script will run continuously, sending API requests every 7 minutes.

## Monitoring

You can view the logs of your running worker directly from the Render dashboard to ensure it's sending requests as expected and to troubleshoot any issues. The `print` statements in your `main.py` script will appear in these logs.

# Deployment Instructions for Railway

This section provides instructions to deploy your Anime API Pinger service to Railway, another platform for hosting applications and services.

## Prerequisites

1.  **Railway Account**: Sign up for an account at [Railway.app](https://railway.app/).
2.  **GitHub Account**: Your project needs to be hosted on GitHub (or GitLab/Bitbucket) for Railway to connect and deploy it. If you haven't already, ensure your `main.py`, `requirements.txt`, `Procfile`, and `runtime.txt` files are pushed to a GitHub repository.

## Deployment Steps

Follow these steps to deploy your API Pinger as a **Service** on Railway:

1.  **Log in to Railway**: Go to [Railway.app](https://railway.app/) and log in to your account.

2.  **Create a New Project**: 
    *   From your Railway dashboard, click on "New Project".
    *   Choose "Deploy from GitHub Repo".

3.  **Connect to Your Repository**: 
    *   Connect your GitHub account if you haven't already.
    *   Select the repository containing your `anime_api_pinger` project.

4.  **Configure Your Service**: 
    *   Railway will automatically detect your Python project and suggest a build configuration. 
    *   **Build Command**: Railway typically handles `pip install -r requirements.txt` automatically. If not, you can specify it.
    *   **Start Command**: Set the start command to run your Python script:
        ```bash
        python main.py
        ```
    *   **Environment Variables**: You might not need any for this simple service, but this is where you would add them if necessary.

5.  **Deploy**: Click "Deploy" to start the deployment process.

Railway will build and deploy your service. You can monitor the deployment logs and the running service's output directly from the Railway dashboard. Your Python script will run continuously, sending API requests every 7 minutes.

## Monitoring

Railway provides a logging interface where you can view the output of your running service, including the `print` statements from your `main.py` script. This is useful for verifying that the API requests are being sent successfully and for debugging any issues.
