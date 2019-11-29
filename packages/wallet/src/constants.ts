import {
  getAdjudicatorContractAddress,
  getConsensusContractAddress,
  getNetworkId,
  getETHAssetHolderAddress,
  getERC20AssetHolderAddress
} from "./utils/contract-utils";

export const ETH_ASSET_HOLDER_ADDRESS = getETHAssetHolderAddress();
export const ERC20_ASSET_HOLDER_ADDRESS = getERC20AssetHolderAddress();
export const ADJUDICATOR_ADDRESS = getAdjudicatorContractAddress();
export const CONSENSUS_LIBRARY_ADDRESS = getConsensusContractAddress();
// TODO: Dynamically fetch on wallet start saga
export const CONSENSUS_LIBRARY_BYTECODE =
  "0x608060405234801561001057600080fd5b506108fc806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806395127f9914610030575b600080fd5b61004361003e366004610417565b610059565b6040516100509190610760565b60405180910390f35b6000610063610249565b61007086602001516101ce565b905061007a610249565b61008786602001516101ce565b805190915063ffffffff16600019850114156100d557865186516100ab91906101f0565b6100d05760405162461bcd60e51b81526004016100c7906107a6565b60405180910390fd5b6101c1565b805163ffffffff1661013957816000015163ffffffff1660011461010b5760405162461bcd60e51b81526004016100c7906107d6565b61011d826020015187600001516101f0565b6100d05760405162461bcd60e51b81526004016100c7906107b6565b8151815163ffffffff90811660001990920116146101695760405162461bcd60e51b81526004016100c7906107c6565b8651865161017791906101f0565b6101935760405162461bcd60e51b81526004016100c790610796565b6101a5826020015182602001516101f0565b6101c15760405162461bcd60e51b81526004016100c790610786565b5060019695505050505050565b6101d6610249565b818060200190516101ea91908101906103da565b92915050565b600081604051602001610203919061076e565b604051602081830303815290604052805190602001208360405160200161022a919061076e565b6040516020818303038152906040528051906020012014905092915050565b60408051808201909152600081526060602082015290565b600082601f83011261027257600080fd5b81356102856102808261080d565b6107e6565b915080825260208301602083018583830111156102a157600080fd5b6102ac838284610853565b50505092915050565b600082601f8301126102c657600080fd5b81516102d46102808261080d565b915080825260208301602083018583830111156102f057600080fd5b6102ac83828461085f565b60006040828403121561030d57600080fd5b61031760406107e6565b9050600061032584846103cf565b825250602082015167ffffffffffffffff81111561034257600080fd5b61034e848285016102b5565b60208301525092915050565b60006040828403121561036c57600080fd5b61037660406107e6565b9050813567ffffffffffffffff81111561038f57600080fd5b61039b84828501610261565b825250602082013567ffffffffffffffff8111156103b857600080fd5b61034e84828501610261565b80356101ea81610899565b80516101ea816108b0565b6000602082840312156103ec57600080fd5b815167ffffffffffffffff81111561040357600080fd5b61040f848285016102fb565b949350505050565b6000806000806080858703121561042d57600080fd5b843567ffffffffffffffff81111561044457600080fd5b6104508782880161035a565b945050602085013567ffffffffffffffff81111561046d57600080fd5b6104798782880161035a565b935050604061048a878288016103c4565b925050606061049b878288016103c4565b91505092959194509250565b6104b081610842565b82525050565b60006104c182610835565b6104cb8185610839565b93506104db81856020860161085f565b6104e48161088f565b9093019392505050565b60006104fb603b83610839565b7f436f6e73656e7375734170703a20696e76616c696420766f74652c2070726f7081527f6f7365644f7574636f6d65206d757374206e6f74206368616e67650000000000602082015260400192915050565b600061055a603283610839565b7f436f6e73656e7375734170703a207768656e20766f74696e672c206f7574636f8152716d65206d757374206e6f74206368616e676560701b602082015260400192915050565b60006105ae604483610839565b7f436f6e73656e7375734170703a207768656e2070726f706f73696e672f76657481527f6f696e672f70617373696e67206f7574636f6d65206d757374206e6f74206368602082015263616e676560e01b604082015260600192915050565b600061061a604d83610839565b7f436f6e73656e7375734170703a20696e76616c69642066696e616c20766f746581527f2c206f7574636f6d65206d75737420657175616c2070726576696f757320707260208201526c6f706f7365644f7574636f6d6560981b604082015260600192915050565b600061068f604183610839565b7f436f6e73656e7375734170703a20696e76616c696420766f74652c206675727481527f686572566f74657352657175697265642073686f756c642064656372656d656e6020820152601d60fa1b604082015260600192915050565b60006106f8604d83610839565b7f436f6e73656e7375734170703a20696e76616c69642066696e616c20766f746581527f2c2066757274686572566f7465735265717569726564206d757374207472616e60208201526c736974696f6e2066726f6d203160981b604082015260600192915050565b602081016101ea82846104a7565b6020808252810161077f81846104b6565b9392505050565b602080825281016101ea816104ee565b602080825281016101ea8161054d565b602080825281016101ea816105a1565b602080825281016101ea8161060d565b602080825281016101ea81610682565b602080825281016101ea816106eb565b60405181810167ffffffffffffffff8111828210171561080557600080fd5b604052919050565b600067ffffffffffffffff82111561082457600080fd5b506020601f91909101601f19160190565b5190565b90815260200190565b151590565b90565b63ffffffff1690565b82818337506000910152565b60005b8381101561087a578181015183820152602001610862565b83811115610889576000848401525b50505050565b601f01601f191690565b6108a281610847565b81146108ad57600080fd5b50565b6108a28161084a56fea365627a7a72315820ee208b472fd0ae3a8dcf9e44e893b43a2c7c4589b23bbdcaa2e4c875579d22d36c6578706572696d656e74616cf564736f6c634300050b0040";
export const NETWORK_ID = getNetworkId();
export const USE_STORAGE = process.env.USE_STORAGE === "TRUE";
// TODO: Move top ENV variable
export const HUB_ADDRESS = "0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C";
export const CHALLENGE_DURATION = 0x12c; // 5 minutes
