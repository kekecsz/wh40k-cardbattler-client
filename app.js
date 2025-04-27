document.getElementById("testButton").addEventListener("click", async () => {
    const responseArea = document.getElementById("responseArea");

    try {
        const response = await fetch('https://card-battler-server-386329199229.europe-central2.run.app/', {
            method: 'GET',  // later will be POST for actions
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        responseArea.textContent = JSON.stringify(data);
    } catch (error) {
        responseArea.textContent = 'Error: ' + error;
    }
});