package he

import (
	"testing"
)

func TestNew(t *testing.T) {
	New()
}

func TestFormatURLPath(t *testing.T) {
	t.Log(formatURLPath("////testing///a") == "/testing/a")
	t.Log(formatURLPath("////testing///a/") == "/testing/a")
	t.Log(formatURLPath("/testing/a") == "/testing/a")
}