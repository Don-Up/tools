function nextRightSibling(root, target) {
    if (!root) {
        return null
    }
    const queue = [root, null]
    while (queue.length){
        const node = queue.shift()
        if(node === target){
            return queue.shift()
        } else if (node === null && queue.length) {
            queue.push(null)
        } else {
            queue.push(...node.children)
        }
    }
    return null
}