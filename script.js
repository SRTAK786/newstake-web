// Contract ABIs and Addresses (REPLACE THESE WITH YOUR ACTUAL VALUES)
const vnstTokenABI = []; // अपना VNST टोकन ABI यहाँ पेस्ट करें
const vnstTokenAddress = "0x..."; // अपना VNST टोकन एड्रेस यहाँ पेस्ट करें
const stakingABI = []; // अपना स्टेकिंग कॉन्ट्रैक्ट ABI यहाँ पेस्ट करें
const stakingAddress = "0x..."; // अपना स्टेकिंग कॉन्ट्रैक्ट एड्रेस यहाँ पेस्ट करें

// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletModal = document.getElementById('walletModal');
const closeModal = document.querySelector('.close-modal');
const metamaskBtn = document.getElementById('metamaskBtn');
const walletConnectBtn = document.getElementById('walletConnectBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

// Global Variables
let web3;
let vnstTokenContract;
let stakingContract;
let accounts = [];
let isConnected = false;

// Initialize the application
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing Web3...");
    
    // Initialize Web3
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            // Check connection
            accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                isConnected = true;
                updateWalletButton();
                initContracts();
                await updateUI();
            }
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', (newAccounts) => {
                accounts = newAccounts;
                isConnected = accounts.length > 0;
                updateWalletButton();
                if (isConnected) updateUI();
            });
            
            // Listen for chain changes
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

            if (window.location.pathname.includes('team.html')) {
                await loadTeamData();
                await loadDetailedReferralEarnings();
            }
            
            if (window.location.pathname.includes('stake.html')) {
                await loadWithdrawHistory();
                await loadWithdrawLimits();
            }
            
        } catch (error) {
            console.error("Error connecting to wallet:", error);
        }
    } else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
    } else {
        console.log('Non-Ethereum browser detected. Consider installing MetaMask!');
    }

    if (isConnected) {
        await updateUI();
    }

    // Event Listeners
    connectWalletBtn.addEventListener('click', toggleWalletModal);
    closeModal.addEventListener('click', toggleWalletModal);
    metamaskBtn.addEventListener('click', connectMetaMask);
    walletConnectBtn.addEventListener('click', connectWalletConnect);
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    
    // Staking Page Specific
    if (window.location.pathname.includes('stake.html')) {
        const approveMaxBtn = document.getElementById('approveMaxBtn');
        const stakeBtn = document.getElementById('stakeBtn');
        const claimTokenBtn = document.getElementById('claimTokenBtn');
        const copyReferralBtn = document.getElementById('copyReferralBtn');

        if (approveMaxBtn) approveMaxBtn.addEventListener('click', approveMax);
        if (stakeBtn) stakeBtn.addEventListener('click', stakeTokens);
        if (claimTokenBtn) claimTokenBtn.addEventListener('click', claimRewards);
        if (copyReferralBtn) copyReferralBtn.addEventListener('click', copyReferralLink);

        setupStakingPage();
    }
    
    // Team Page Specific
    if (window.location.pathname.includes('team.html')) {
        loadTeamData();
    }
    
    animateCardsOnScroll();
});

// Initialize contracts
function initContracts() {
    try {
        if (!web3) {
            console.error("Web3 not initialized");
            return;
        }

        vnstTokenContract = new web3.eth.Contract(vnstTokenABI, vnstTokenAddress);
        stakingContract = new web3.eth.Contract(stakingABI, stakingAddress);
        console.log("Contracts initialized successfully");
    } catch (error) {
        console.error("Error initializing contracts:", error);
    }
}

// Wallet functions
function toggleWalletModal() {
    walletModal.style.display = walletModal.style.display === 'block' ? 'none' : 'block';
}

function toggleMobileMenu() {
    navMenu.classList.toggle('show');
}

async function connectMetaMask() {
    try {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Connected account:", accounts[0]);
        
        isConnected = true;
        updateWalletButton();
        initContracts();
        await updateUI();
        
        toggleWalletModal();
    } catch (error) {
        console.error("Connection failed:", error);
        alert("Connection failed: " + error.message);
    }
}

async function connectWalletConnect() {
    alert("WalletConnect integration would go here in a full implementation");
    toggleWalletModal();
}

function updateWalletButton() {
    if (isConnected && accounts[0]) {
        const shortAddress = `${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
        connectWalletBtn.textContent = shortAddress;
        connectWalletBtn.classList.add('connected');
    } else {
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.classList.remove('connected');
    }
}

// Staking functions
async function approveMax() {
    if (!isConnected) return alert("Please connect your wallet first");
    
    try {
        const maxAmount = web3.utils.toWei('10000', 'ether');
        const result = await vnstTokenContract.methods.approve(stakingAddress, maxAmount)
            .send({ from: accounts[0] });
        console.log("Approval successful:", result);
        alert("Approval successful! You can now stake VNST tokens.");
    } catch (error) {
        console.error("Approval failed:", error);
        alert("Approval failed: " + error.message);
    }
}

async function stakeTokens() {
    if (!isConnected) return alert("Please connect your wallet first");
    
    const amount = document.getElementById('stakeAmount')?.value;
    if (!amount || amount < 100 || amount > 10000) {
        return alert("Please enter a valid amount between 100 and 10,000 VNST");
    }
    
    try {
        const amountWei = web3.utils.toWei(amount, 'ether');
        const referralAddress = document.getElementById('referralAddress')?.value || accounts[0];
        
        // Check allowance
        const allowance = await vnstTokenContract.methods.allowance(accounts[0], stakingAddress).call();
        if (parseInt(allowance) < parseInt(amountWei)) {
            return alert("Please approve the contract to spend your VNST tokens first");
        }
        
        // Execute stake
        const result = await stakingContract.methods.stake(amountWei, referralAddress)
            .send({ from: accounts[0] });
        console.log("Staking successful:", result);
        alert("Staking successful!");
        await updateUI();
    } catch (error) {
        console.error("Staking failed:", error);
        alert("Staking failed: " + error.message);
    }
}

async function claimRewards() {
    if (!isConnected) return alert("Please connect your wallet first");
    
    try {
        const result = await stakingContract.methods.claimRewards()
            .send({ from: accounts[0] });
        console.log("Rewards claimed:", result);
        alert("Rewards claimed successfully!");
        await updateUI();
    } catch (error) {
        console.error("Claim failed:", error);
        alert("Claim failed: " + error.message);
    }
}

// Team Page Functions
async function loadTeamData() {
    if (!isConnected || !accounts[0] || !stakingContract) {
        console.log("Not connected or contracts not initialized");
        return;
    }
    
    try {
        console.log("Loading team data...");

        const [levelDetails, userLevel, userInfo] = await Promise.all([
            stakingContract.methods.getLevelDetails(accounts[0]).call(),
            stakingContract.methods.curUserLevel(accounts[0]).call(),
            stakingContract.methods.users(accounts[0]).call()
        ]);

        document.getElementById('userLevel').textContent = userLevel;
        
        for (let i = 1; i <= 5; i++) {
            try {
                const levelIndex = i - 1;
                const team = await stakingContract.methods.getTeamUsers(accounts[0], levelIndex).call();
                
                document.getElementById(`level${i}Count`).textContent = `${team.length} Members`;
                document.getElementById(`level${i}Status`).textContent = 
                    levelDetails.levelsAchieved[levelIndex] ? "Unlocked" : "Locked";
                document.getElementById(`level${i}Status`).style.color = 
                    levelDetails.levelsAchieved[levelIndex] ? "#4CAF50" : "#F44336";
                document.getElementById(`level${i}Stake`).textContent = 
                    `${web3.utils.fromWei(levelDetails.levelDeposits[levelIndex], 'ether')} VNST`;
                    
            } catch (error) {
                console.error(`Level ${i} loading error:`, error);
                document.getElementById(`level${i}Count`).textContent = "0 Members";
                document.getElementById(`level${i}Status`).textContent = "Locked";
                document.getElementById(`level${i}Status`).style.color = "#F44336";
                document.getElementById(`level${i}Stake`).textContent = "0 VNST";
            }
        }

        document.getElementById('totalTeamMembers').textContent = userInfo.referralCount;
        
        const totalTeamStake = await stakingContract.methods.getTotalStaked(accounts[0]).call();
        document.getElementById('totalTeamStake').textContent = 
            `${web3.utils.fromWei(totalTeamStake, 'ether')} VNST`;
        
        const directIncome = await calculateDirectIncome();
        document.getElementById('directIncome').textContent = 
            `${web3.utils.fromWei(directIncome, 'ether')} USDT`;
        
        const roiIncome = await calculateROIIncome();
        document.getElementById('roiIncome').textContent = 
            `${web3.utils.fromWei(roiIncome, 'ether')} USDT`;
        
    } catch (error) {
        console.error("Team data loading failed:", error);
    }
}

async function calculateROIIncome() {
    try {
        const userInfo = await stakingContract.methods.users(accounts[0]).call();
        const totalClaimed = userInfo.totalClaimed;
        const roiIncome = web3.utils.toBN(totalClaimed).mul(web3.utils.toBN(2)).div(web3.utils.toBN(100));
        return roiIncome.toString();
    } catch (error) {
        console.error("Error calculating ROI income:", error);
        return "0";
    }
}

async function calculateDirectIncome() {
    try {
        const userInfo = await stakingContract.methods.users(accounts[0]).call();
        let totalDirectIncome = web3.utils.toBN(0);
        
        for (let i = 0; i < 5; i++) {
            const levelDeposit = userInfo.levelDeposits && userInfo.levelDeposits[i] 
                ? web3.utils.toBN(userInfo.levelDeposits[i])
                : web3.utils.toBN(0);
                
            const rewardPercent = 5 - i;
            const levelIncome = levelDeposit.mul(web3.utils.toBN(rewardPercent)).div(web3.utils.toBN(100));
            
            totalDirectIncome = totalDirectIncome.add(levelIncome);
        }
        
        return totalDirectIncome.toString();
    } catch (error) {
        console.error("Error calculating direct income:", error);
        return "0";
    }
}

// Staking Page Functions
async function setupStakingPage() {
    if (!isConnected || !accounts[0] || !stakingContract) return;
    
    try {
        const stakesCount = await stakingContract.methods.getUserStakesCount(accounts[0]).call();
        const stakesList = document.getElementById('stakesList');
        stakesList.innerHTML = '';
        
        let totalActive = 0;
        if (stakesCount > 0) {
            for (let i = 0; i < stakesCount; i++) {
                const stake = await stakingContract.methods.userStakes(accounts[0], i).call();
                if (stake.isActive) {
                    const stakeAmount = web3.utils.fromWei(stake.amount, 'ether');
                    totalActive += parseFloat(stakeAmount);

                    const currentDay = Math.floor(Date.now() / 86400);
                    const daysStaked = currentDay - stake.startDay;
                    
                    stakesList.innerHTML += `
                        <div class="stake-item">
                            <p><strong>Stake #${i+1}:</strong> ${stakeAmount} VNST</p>
                            <p>Days staked: ${stake.daysStaked || 0}/365</p>
                        </div>
                    `;
                }
            }
        } else {
            stakesList.innerHTML = '<p>No active stakes found</p>';
        }
        
        document.getElementById('totalActiveStake').textContent = `${totalActive} VNST`;
        
        const rewards = await stakingContract.methods.getPendingRewards(accounts[0]).call();
        if (Array.isArray(rewards)) {
            const vntRewards = web3.utils.fromWei(rewards[0] || '0', 'ether');
            const usdtRewards = web3.utils.fromWei(rewards[1] || '0', 'ether');
            
            document.getElementById('stakingRewards').textContent = `${vntRewards} VNT`;
            document.getElementById('totalPendingRewards').textContent = `${vntRewards} VNT + ${usdtRewards} USDT`;
            
            const directRewards = (parseFloat(usdtRewards) * 0.5).toFixed(4);
            const roiRewards = (parseFloat(usdtRewards) * 0.5).toFixed(4);
            
            document.getElementById('directRewards').textContent = `${directRewards} USDT`;
            document.getElementById('roiRewards').textContent = `${roiRewards} USDT`;
        }
        
        document.getElementById('referralLink').value = 
            `${window.location.origin}/stake.html?ref=${accounts[0]}`;
            
    } catch (error) {
        console.error("Error setting up staking page:", error);
    }
}

// New Functions Added Here
async function loadWithdrawHistory() {
  if (!isConnected || !accounts[0]) return;
  
  try {
    const history = await stakingContract.methods.getWithdrawHistory(accounts[0]).call();
    const historyList = document.getElementById('withdrawHistoryList');
    historyList.innerHTML = '';

    if (history && history.length > 0) {
      history.forEach((tx, index) => {
        const amount = web3.utils.fromWei(tx.amount, 'ether');
        const date = new Date(tx.timestamp * 1000).toLocaleString();
        historyList.innerHTML += `
          <div class="history-item">
            <p><strong>#${index + 1}:</strong> ${amount} USDT/VNT</p>
            <p>Date: ${date}</p>
            <p>Status: ${tx.isCompleted ? 'Completed' : 'Pending'}</p>
          </div>
        `;
      });
    } else {
      historyList.innerHTML = '<p>No withdrawal history found.</p>';
    }
  } catch (error) {
    console.error("Error loading withdrawal history:", error);
  }
}

async function loadWithdrawLimits() {
  if (!isConnected) return;
  
  try {
    const [minVNT, minUSDT, isActive] = await stakingContract.methods.getMinWithdrawInfo().call();
    document.getElementById('minVNTWithdraw').textContent = `${web3.utils.fromWei(minVNT, 'ether')} VNT`;
    document.getElementById('minUSDTWithdraw').textContent = `${web3.utils.fromWei(minUSDT, 'ether')} USDT`;
  } catch (error) {
    console.error("Error loading withdrawal limits:", error);
  }
}

async function loadDetailedReferralEarnings() {
  if (!isConnected || !accounts[0]) return;
  
  try {
    const [totalEarnings, teamDeposits, referralCount] = 
      await stakingContract.methods.getReferralEarnings(accounts[0]).call();
    
    document.getElementById('totalReferralEarnings').textContent = 
      web3.utils.fromWei(totalEarnings, 'ether');
    document.getElementById('teamDeposits').textContent = 
      web3.utils.fromWei(teamDeposits, 'ether');
    document.getElementById('totalReferrals').textContent = referralCount;
  } catch (error) {
    console.error("Error loading referral earnings:", error);
  }
}

async function loadDetailedStakeHistory() {
  if (!isConnected || !accounts[0]) return;
  
  try {
    const history = await stakingContract.methods.getStakeHistory(accounts[0]).call();
    const historyDiv = document.getElementById('detailedStakeHistory');
    historyDiv.innerHTML = '';

    if (history.amounts.length > 0) {
      history.amounts.forEach((amount, index) => {
        historyDiv.innerHTML += `
          <div class="stake-item">
            <p><strong>Stake #${index + 1}:</strong> ${web3.utils.fromWei(amount, 'ether')} VNST</p>
            <p>Start Day: ${history.startDays[index]}</p>
            <p>Status: ${history.isActive[index] ? 'Active' : 'Inactive'}</p>
          </div>
        `;
      });
    } else {
      historyDiv.innerHTML = '<p>No stake history found.</p>';
    }
  } catch (error) {
    console.error("Error loading stake history:", error);
  }
}

// UI functions
async function updateUI() {
    if (!isConnected || !accounts[0]) {
        console.log("UI update skipped - not connected");
        return;
    }

    try {
        console.log("Updating UI...");
        
        if (!vnstTokenContract || !stakingContract) {
            initContracts();
        }
        
        updateWalletButton();
        
        if (document.getElementById('walletBalance')) {
            const balance = await vnstTokenContract.methods.balanceOf(accounts[0]).call();
            document.getElementById('walletBalance').textContent = 
                `${web3.utils.fromWei(balance, 'ether')} VNST`;
        }
        
        if (window.location.pathname.includes('team.html')) {
            await loadTeamData();
            await loadDetailedReferralEarnings();
        } 
        else if (window.location.pathname.includes('stake.html')) {
            await setupStakingPage();
            await loadWithdrawHistory();
            await loadWithdrawLimits();
        }
        else {
            await updateHomePage();
        }
        
    } catch (error) {
        console.error("UI update failed:", error);
    }
}

async function updateHomePage() {
    try {
        const totalStaked = await stakingContract.methods.getTotalStaked(accounts[0]).call();
        if (document.getElementById('totalStaked')) {
            document.getElementById('totalStaked').textContent = 
                `${web3.utils.fromWei(totalStaked, 'ether')} VNST`;
        }
        
        const rewards = await stakingContract.methods.getPendingRewards(accounts[0]).call();
        if (rewards && document.getElementById('totalRewards')) {
            const vntRewards = web3.utils.fromWei(rewards[0] || '0', 'ether');
            const usdtRewards = web3.utils.fromWei(rewards[1] || '0', 'ether');
            document.getElementById('totalRewards').textContent = 
                `${vntRewards} VNT + ${usdtRewards} USDT`;
        }
        
        const userInfo = await stakingContract.methods.users(accounts[0]).call();
        if (document.getElementById('referralCount')) {
            document.getElementById('referralCount').textContent = userInfo.referralCount;
        }
    } catch (error) {
        console.error("Home page update failed:", error);
    }
}

// Utility functions
function copyReferralLink() {
    const referralLinkInput = document.getElementById('referralLink');
    if (!referralLinkInput) return;
    
    referralLinkInput.select();
    document.execCommand('copy');
    alert("Referral link copied to clipboard!");
}

function animateCardsOnScroll() {
    const cards = document.querySelectorAll('.card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    cards.forEach(card => observer.observe(card));
}
