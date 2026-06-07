// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Synthetix-style staking rewards pool.
/// Stake `stakingToken`, earn `rewardToken` proportional to your share × time.
/// Core invariant: rewardPerToken() grows monotonically as long as rewards are active.
contract StakingPool {
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;
    address public immutable owner;

    uint256 public immutable rewardsDuration;
    uint256 public periodFinish;      // timestamp when current period ends
    uint256 public rewardRate;        // reward tokens per second (whole pool)
    uint256 public lastUpdateTime;    // last checkpoint timestamp
    uint256 public rewardPerTokenStored; // accumulated rewards per staked token (scaled 1e18)

    uint256 public totalStaked;
    mapping(address => uint256) public staked;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward);

    constructor(address _stakingToken, address _rewardToken, uint256 _rewardsDuration) {
        require(_stakingToken != address(0) && _rewardToken != address(0), "Zero address");
        require(_rewardsDuration > 0, "Duration = 0");
        stakingToken = IERC20(_stakingToken);
        rewardToken  = IERC20(_rewardToken);
        owner = msg.sender;
        rewardsDuration = _rewardsDuration;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // Checkpoint: update global accumulator, then user's snapshot
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // Returns the lesser of now vs periodFinish — rewards stop accruing after period ends
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    // Global rewards-per-token accumulator
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored
            + (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalStaked;
    }

    // How many reward tokens `account` has earned so far
    function earned(address account) public view returns (uint256) {
        return staked[account]
            * (rewardPerToken() - userRewardPerTokenPaid[account])
            / 1e18
            + rewards[account];
    }

    function stake(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalStaked += amount;
        staked[msg.sender] += amount;
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(staked[msg.sender] >= amount, "Insufficient staked");
        totalStaked -= amount;
        staked[msg.sender] -= amount;
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function claimReward() public updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            require(rewardToken.transfer(msg.sender, reward), "Transfer failed");
            emit RewardClaimed(msg.sender, reward);
        }
    }

    // Withdraw all staked tokens + claim all pending rewards in one tx
    function exit() external {
        withdraw(staked[msg.sender]);
        claimReward();
    }

    // Owner funds the reward pool — redistributes any leftover from current period
    function notifyRewardAmount(uint256 amount) external onlyOwner updateReward(address(0)) {
        require(rewardToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        if (block.timestamp >= periodFinish) {
            rewardRate = amount / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover  = remaining * rewardRate;
            rewardRate = (amount + leftover) / rewardsDuration;
        }
        lastUpdateTime = block.timestamp;
        periodFinish   = block.timestamp + rewardsDuration;
        emit RewardAdded(amount);
    }

    function getPoolInfo() external view returns (
        uint256 _totalStaked,
        uint256 _rewardRate,
        uint256 _periodFinish,
        uint256 _rewardsDuration,
        address _stakingToken,
        address _rewardToken,
        address _owner
    ) {
        return (totalStaked, rewardRate, periodFinish, rewardsDuration,
                address(stakingToken), address(rewardToken), owner);
    }
}
