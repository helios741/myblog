def main():
    tup = (4,  7, 8)
    print tup
    l = [5, 6, 7]
    tmp_l=list(tup)
    tmp_tup=tuple(l)
    print type(tmp_l)
    print type(tmp_tup)
    print l.count(7)
    print tup.count(7)
    print l.__sizeof__()
    print tup.__sizeof__()
    print "---------------"
    print l.__sizeof__()
    l.append(1)
    print l.__sizeof__()
    l1=[]
    print l1.__sizeof__()
    l1.append(1)
    print l1.__sizeof__()
    l1.append(1)
    print l1.__sizeof__()
    l1.append(1)
    print l1.__sizeof__()
    l1.append(1)
    print l1.__sizeof__()
    l2 = l[1:3]
    print l2
    print type(l2)
    tup1=tup[1:2]
    print tup1
    print type(tup1)
    l3=()
    print l3.__sizeof__()





if __name__ == "__main__":
    main()
