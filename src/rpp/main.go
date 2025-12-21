package main

import (
	"fmt"
	"os"

	"github.com/atotto/clipboard"
)

func main() {
	// 1. Check if a filename argument was provided
	if len(os.Args) < 2 {
		fmt.Println("Usage: rpp <filename>")
		os.Exit(1)
	}

	targetFile := os.Args[1]

	// 2. Verify the target exists and is strictly a file (not a directory)
	info, err := os.Stat(targetFile)
	if os.IsNotExist(err) {
		fmt.Printf("Error: File '%s' does not exist.\n", targetFile)
		os.Exit(1)
	}
	if err != nil {
		fmt.Printf("Error checking file: %v\n", err)
		os.Exit(1)
	}
	if info.IsDir() {
		fmt.Printf("Error: '%s' is a directory, not a file.\n", targetFile)
		os.Exit(1)
	}

	// 3. Get content from the clipboard
	content, err := clipboard.ReadAll()
	if err != nil {
		fmt.Printf("Error reading clipboard: %v\n", err)
		os.Exit(1)
	}

	// 4. Overwrite the file with clipboard content
	// 0644 preserves standard read/write permissions for the owner
	err = os.WriteFile(targetFile, []byte(content), 0644)
	if err != nil {
		fmt.Printf("Error writing to file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Successfully replaced '%s' with clipboard content.\n", targetFile)
}
